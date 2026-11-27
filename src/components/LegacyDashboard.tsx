import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PeakChartHost } from "@/components/ui/peak-chart";
import { Sparkline, type SparklineSeries } from "@/components/ui/sparkline";
import { TreemapChart, type TreemapDatum } from "@/components/ui/treemap-chart";

type TreemapMountEvent = CustomEvent<{ data: TreemapDatum[]; dateLabel: string }>;
type SparklineMountEvent = CustomEvent<{
  targetId: string;
  series: SparklineSeries[];
  title: string;
  unit?: string;
  height?: number;
}>;

export function LegacyDashboard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let peakRoot: Root | undefined;
    let treemapRoot: Root | undefined;
    let core: HTMLScriptElement | undefined;
    let silk: HTMLScriptElement | undefined;
    let revealObserver: IntersectionObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    let onPageChange: (() => void) | undefined;
    const sparklineRoots = new Map<string, { root: Root; slot: HTMLElement }>();

    const onTreemapMount = (event: Event) => {
      const slot = hostRef.current?.querySelector("#react-treemap-chart-root");
      const payload = (event as TreemapMountEvent).detail;
      if (slot && payload) {
        treemapRoot?.unmount();
        treemapRoot = createRoot(slot);
        treemapRoot.render(<TreemapChart data={payload.data} dateLabel={payload.dateLabel} />);
      }
    };

    const onSparklineMount = (event: Event) => {
      const payload = (event as SparklineMountEvent).detail;
      if (!payload?.targetId || !payload.series) return;
      const slot = hostRef.current?.querySelector<HTMLElement>(`#${payload.targetId}`);
      if (!slot) return;
      let entry = sparklineRoots.get(payload.targetId);
      if (!entry || entry.slot !== slot) {
        entry?.root.unmount();
        entry = { root: createRoot(slot), slot };
        sparklineRoots.set(payload.targetId, entry);
      }
      entry.root.render(
        <Sparkline
          series={payload.series}
          title={payload.title}
          unit={payload.unit || ""}
          height={payload.height || 104}
          showHeading={false}
          className="w-full"
        />,
      );
    };

    window.addEventListener("shad:treemap-mount", onTreemapMount);
    window.addEventListener("shad:sparkline-mount", onSparklineMount);

    async function mount() {
      try {
        const response = await fetch("/legacy-dashboard.html", { cache: "no-store" });
        if (!response.ok) throw new Error("بارگذاری ساختار داشبورد ناموفق بود (" + response.status + ")");
        const markup = await response.text();
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = markup;

        const revealSelector = ".kpi,.panel,.ab-card,.module-card,.fresh-item,.chart,.plot,.kpis > *, .module-cards > *, .page > .section-title, .page > .note, .page > .freshness, .page > .table-wrap";
        revealObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver?.unobserve(entry.target);
            }
          }
        }, { threshold: 0.06, rootMargin: "0px 0px -7% 0px" });

        const scanReveal = (scope: ParentNode) => {
          const nodes: Element[] = [];
          if (scope instanceof Element && scope.matches(revealSelector)) nodes.push(scope);
          scope.querySelectorAll(revealSelector).forEach((node) => nodes.push(node));
          for (const node of nodes) {
            if (node.classList.contains("reveal-ready")) continue;
            node.classList.add("reveal-ready");
            const index = node.parentElement ? Array.from(node.parentElement.children).indexOf(node) : 0;
            node.setAttribute("style", (node.getAttribute("style") || "") + `;--reveal-delay:${(index % 4) * 55}ms`);
            revealObserver?.observe(node);
          }
        };

        scanReveal(hostRef.current);
        mutationObserver = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof Element) scanReveal(node);
            }
          }
        });
        mutationObserver.observe(hostRef.current, { childList: true, subtree: true });

        onPageChange = () => {
          requestAnimationFrame(() => {
            const active = hostRef.current?.querySelector(".page.active");
            if (active) scanReveal(active);
          });
        };
        window.addEventListener("shad:page-change", onPageChange);

        const peakSlot = hostRef.current.querySelector("#react-peak-chart-root");
        if (peakSlot) {
          peakRoot = createRoot(peakSlot);
          peakRoot.render(<PeakChartHost />);
        }

        core = document.createElement("script");
        core.src = "/legacy-dashboard.js";
        core.async = false;
        core.onerror = () => setError("اجرای منطق داشبورد انجام نشد.");
        document.body.appendChild(core);

        silk = document.createElement("script");
        silk.src = "/silk-background.js";
        silk.async = false;
        document.body.appendChild(silk);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "خطای ناشناخته در راه‌اندازی داشبورد");
      }
    }

    void mount();
    return () => {
      cancelled = true;
      window.removeEventListener("shad:treemap-mount", onTreemapMount);
      window.removeEventListener("shad:sparkline-mount", onSparklineMount);
      if (onPageChange) window.removeEventListener("shad:page-change", onPageChange);
      mutationObserver?.disconnect();
      revealObserver?.disconnect();
      peakRoot?.unmount();
      treemapRoot?.unmount();
      sparklineRoots.forEach(({ root }) => root.unmount());
      sparklineRoots.clear();
      core?.remove();
      silk?.remove();
      document.getElementById("shad-silk-background")?.remove();
      document.querySelectorAll("style[data-shad-silk]").forEach((node) => node.remove());
    };
  }, []);

  return (
    <>
      {error && <div role="alert" className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>}
      <div ref={hostRef} />
    </>
  );
}
