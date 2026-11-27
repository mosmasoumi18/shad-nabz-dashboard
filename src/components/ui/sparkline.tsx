import { useEffect, useMemo, useRef, useState, useId, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

export type SparklinePoint = { date: string; value: number };
export type SparklineSeries = {
  id?: string;
  name: string;
  points: SparklinePoint[];
};

export interface SparklineProps {
  series: SparklineSeries[];
  title?: string;
  subtitle?: string;
  unit?: string;
  height?: number;
  className?: string;
  showHeading?: boolean;
}

const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const compactFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const fullNumber = (value: number) => numberFormat.format(value);
const compactNumber = (value: number) => {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9) return compactFormat.format(value / 1e9) + " میلیارد";
  if (magnitude >= 1e6) return compactFormat.format(value / 1e6) + " میلیون";
  if (magnitude >= 1e3) return compactFormat.format(value / 1e3) + " هزار";
  return compactFormat.format(value);
};
const jalaliLabel = (date: string) => {
  const parts = date.replace(/-/g, "/").split("/");
  if (parts.length < 3) return date.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const digits = (value: number) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value);
  return Number.isFinite(month) && month >= 1 && month <= 12
    ? `${digits(day)} ${months[month - 1]}`
    : date.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
};
const chartPalette = ["#0EA5E9", "#F97316", "#22C55E", "#A855F7", "#EAB308", "#EC4899", "#14B8A6", "#EF4444"];
const colorFor = (index: number) => chartPalette[index % chartPalette.length];

export function Sparkline({
  series,
  title = "روند تغییرات",
  subtitle,
  unit = "",
  height = 104,
  className,
  showHeading = true,
}: SparklineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const liveId = useId().replace(/:/g, "");
  const [width, setWidth] = useState(320);
  const [hidden, setHidden] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safeSeries = useMemo(
    () => series.map((item, index) => ({
      ...item,
      id: item.id || `series-${index}`,
      points: item.points
        .filter((point) => point.date && Number.isFinite(point.value))
        .map((point) => ({ ...point, date: point.date.replace(/-/g, "/") }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })),
    [series],
  );
  const dates = useMemo(
    () => [...new Set(safeSeries.flatMap((item) => item.points.map((point) => point.date)))].sort(),
    [safeSeries],
  );
  const visibleSeries = safeSeries.filter((item) => !hidden.includes(item.id));
  const values = visibleSeries.flatMap((item) => item.points.map((point) => point.value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const range = maxValue === minValue ? Math.max(1, Math.abs(maxValue) * 0.08) : (maxValue - minValue) * 0.12;
  const min = minValue - range;
  const max = maxValue + range;
  const padding = 9;
  const rightEdge = Math.max(padding + 1, width - 48);
  const plotWidth = Math.max(1, rightEdge - padding);
  const xAt = (index: number) => dates.length <= 1
    ? rightEdge
    : rightEdge - (index / (dates.length - 1)) * plotWidth;
  const tickValues = Array.from({ length: 5 }, (_, index) => max - ((max - min) * index) / 4);
  const tickLabel = (value: number) => compactNumber(value);
  const yAt = (value: number) => height - 12 - ((value - min) / Math.max(1e-9, max - min)) * (height - 24);
  const activeDate = activeIndex === null ? null : dates[activeIndex];

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(1, Math.floor(entry.contentRect.width));
      setWidth((current) => current === nextWidth ? current : nextWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActiveIndex(dates.length ? dates.length - 1 : null);
  }, [dates]);

  const summaries = safeSeries.map((item) => {
    const first = item.points[0];
    const last = item.points[item.points.length - 1];
    if (!first || !last) return `${item.name}: داده‌ای موجود نیست`;
    const change = first.value === 0 ? null : ((last.value - first.value) / Math.abs(first.value)) * 100;
    return `${item.name}: ${fullNumber(first.value)} به ${fullNumber(last.value)} ${unit}، تغییر ${change === null ? "قابل محاسبه نیست" : compactFormat.format(change) + "٪"}`;
  });
  const ariaLabel = `${title}. ${summaries.join("؛ ")}. قدیمی‌ترین مقدار در سمت راست و آخرین مقدار در سمت چپ است.`;

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!dates.length) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setActiveIndex(null);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(dates.length - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(dates.length - 1, (current ?? -1) + 1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, (current ?? dates.length) - 1));
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dates.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (width - padding - pointX) / plotWidth));
    setActiveIndex(Math.round(ratio * (dates.length - 1)));
  };

  const toggleSeries = (id: string) => {
    setHidden((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (visibleSeries.length <= 1) return current;
      return [...current, id];
    });
  };

  const activeRows = visibleSeries.map((item) => {
    const point = item.points.find((candidate) => candidate.date === activeDate);
    return point ? `${item.name}: ${fullNumber(point.value)} ${unit}` : `${item.name}: داده‌ای ثبت نشده`;
  });

  return (
    <section dir="rtl" className={cn("min-w-0 w-full text-foreground", className)}>
      {showHeading && (
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold">{title}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      )}
      <div ref={hostRef} className="min-w-0 w-full">
        {dates.length ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            aria-describedby={liveId}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActiveIndex(dates.length - 1)}
            className="block max-w-full touch-pan-y overflow-visible rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <g aria-hidden="true">
              {tickValues.map((value, index) => {
                const y = yAt(value);
                return (
                  <g key={index}>
                    <line x1={padding} x2={rightEdge} y1={y} y2={y} stroke="var(--border)" strokeOpacity="0.72" strokeDasharray={index === 4 ? "0" : "3 4"} />
                    <text x={width - 3} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">{tickLabel(value)}</text>
                  </g>
                );
              })}
            </g>
            {visibleSeries.map((item, index) => {
              const pointMap = new Map(item.points.map((point) => [point.date, point.value]));
              let path = "";
              let drawing = false;
              dates.forEach((date, dateIndex) => {
                const value = pointMap.get(date);
                if (value === undefined) {
                  drawing = false;
                  return;
                }
                path += `${drawing ? "L" : "M"} ${xAt(dateIndex).toFixed(1)} ${yAt(value).toFixed(1)} `;
                drawing = true;
              });
              const last = item.points[item.points.length - 1];
              const lastIndex = last ? dates.indexOf(last.date) : -1;
              const activeValue = activeDate ? pointMap.get(activeDate) : undefined;
              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={colorFor(index)}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="1"
                    className="sparkline-entry"
                  />
                  {last && lastIndex >= 0 && (
                    <circle cx={xAt(lastIndex)} cy={yAt(last.value)} r="3.8" fill={colorFor(index)} stroke="var(--background)" strokeWidth="2">
                      <title>{item.name} · {jalaliLabel(last.date)} · {fullNumber(last.value)} {unit}</title>
                    </circle>
                  )}
                  {activeValue !== undefined && activeIndex !== null && (
                    <circle cx={xAt(activeIndex)} cy={yAt(activeValue)} r="4.3" fill="var(--background)" stroke={colorFor(index)} strokeWidth="2.5">
                      <title>{item.name} · {jalaliLabel(activeDate || "")} · {fullNumber(activeValue)} {unit}</title>
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="grid place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground" style={{ height }}>
            داده‌ای برای نمایش وجود ندارد.
          </div>
        )}
      </div>
      {dates.length > 0 && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{jalaliLabel(dates[0])}{(() => { const valuesAtStart = visibleSeries.map((item) => item.points.find((point) => point.date === dates[0])?.value).filter((value): value is number => value !== undefined); return valuesAtStart.length ? ` · ${compactNumber(valuesAtStart[0])}` : ""; })()}</span>
          <span>{jalaliLabel(dates[dates.length - 1])}{(() => { const valuesAtEnd = visibleSeries.map((item) => item.points.find((point) => point.date === dates[dates.length - 1])?.value).filter((value): value is number => value !== undefined); return valuesAtEnd.length ? ` · ${compactNumber(valuesAtEnd[0])}` : ""; })()}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {safeSeries.map((item, index) => {
          const isVisible = !hidden.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isVisible}
              disabled={isVisible && visibleSeries.length === 1}
              onClick={() => toggleSeries(item.id)}
              className="inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorFor(index), opacity: isVisible ? 1 : 0.3 }} />
              <span className={isVisible ? "" : "line-through"}>{item.name}</span>
            </button>
          );
        })}
      </div>
      <p id={liveId} aria-live="polite" className="sr-only">
        {activeDate ? `${jalaliLabel(activeDate)}؛ ${activeRows.join("؛ ")}` : "مقدار فعال پاک شد."}
      </p>
      <table className="sr-only">
        <caption>جدول داده‌های خام نمودار {title}</caption>
        <thead><tr><th>تاریخ</th>{safeSeries.map((item) => <th key={item.id}>{item.name}</th>)}</tr></thead>
        <tbody>
          {dates.map((date) => (
            <tr key={date}>
              <th>{date}</th>
              {safeSeries.map((item) => {
                const value = item.points.find((point) => point.date === date)?.value;
                return <td key={item.id}>{value === undefined ? "—" : fullNumber(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
