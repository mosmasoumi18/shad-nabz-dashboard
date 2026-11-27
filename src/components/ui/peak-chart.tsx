import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkline, type SparklinePoint } from "@/components/ui/sparkline";

export type PeakPoint = SparklinePoint;
type Period = "weekly" | "monthly" | "yearly";
export interface PeakChartProps {
  data: PeakPoint[];
  title?: string;
  subtitle?: string;
  unit?: string;
  className?: string;
}
const periods: { key: Period; label: string; count: number }[] = [
  { key: "weekly", label: "هفتگی", count: 7 },
  { key: "monthly", label: "ماهانه", count: 30 },
  { key: "yearly", label: "سالانه", count: 365 },
];
const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faDate = (value: string) => value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function PeakChart({
  data,
  title = "روند فعالیت روزانه",
  subtitle = "بر پایه داده‌های واقعی DailyActivity",
  unit = "کاربر",
  className,
}: PeakChartProps) {
  const [period, setPeriod] = useState<Period>("monthly");
  const points = useMemo(
    () => data.filter((point) => Number.isFinite(point.value)).slice(-periods.find((item) => item.key === period)!.count),
    [data, period],
  );

  return (
    <section dir="rtl" className={cn("min-w-0 rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex rounded-xl border border-border bg-muted p-1" role="group" aria-label="بازه نمودار">
          {periods.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={period === item.key}
              onClick={() => setPeriod(item.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {points.length ? (
        <>
          <div className="mb-1 text-xs text-muted-foreground">{faNumber.format(points.length)} نقطه ثبت‌شده</div>
          <Sparkline
            series={[{ id: "daily-activity", name: "فعالیت روزانه", points }]}
            title={title}
            unit={unit}
            showHeading={false}
          />
        </>
      ) : (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">DailyActivity · داده خام منبع · {points.length ? faDate(points[points.length - 1].date) : "—"}</div>
    </section>
  );
}

type DataEvent = CustomEvent<{ points: PeakPoint[]; snapshot: string }>;
export function PeakChartHost() {
  const [data, setData] = useState<PeakPoint[]>([]);
  const [snapshot, setSnapshot] = useState("");
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as DataEvent).detail;
      setData(detail.points || []);
      setSnapshot(detail.snapshot || "");
    };
    window.addEventListener("shad:data-ready", receive);
    return () => window.removeEventListener("shad:data-ready", receive);
  }, []);
  return (
    <PeakChart
      data={data}
      title="روند فعالیت واقعی شاد"
      subtitle={snapshot ? "Snapshot دیتابیس: " + faDate(snapshot) : "DailyActivity · از بسته داده بارگذاری‌شده"}
      unit="کاربر"
    />
  );
}
