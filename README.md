# SHAD | Nabz — React Product Intelligence Dashboard

داشبورد فارسی و RTL با React، TypeScript، Vite و Tailwind CSS. ساختار و منطق تحلیلی قبلی حفظ شده تا ماژول‌ها، جداول، فیلترها و نمودارها در مهاجرت حذف نشوند. نمودار PeakChart به‌صورت کامپوننت React مستقل و متصل به سری واقعی DailyActivity اضافه شده است.

## توسعه
```bash
npm install
npm run dev
```
## ساخت
```bash
npm run build
npm run preview
```
## ساختار
- src/App.tsx: ریشه React
- src/components/LegacyDashboard.tsx: راه‌اندازی داشبورد در چرخه عمر React
- src/components/ui/peak-chart.tsx: نمودار Canvas با Weekly / Monthly / Yearly
- src/lib/utils.ts: تابع cn سازگار با الگوی shadcn/ui
- src/styles/legacy.css: استایل موجود
- public/legacy-dashboard.js: منطق فعلی تحلیل و نمودارها
- public/data.json.gz و public/advanced.json: داده و پیکربندی نمودارها

## داده و حریم خصوصی
فایل داده بسته‌بندی‌شده فعلی حفظ می‌شود. فایل خام Data.zip به مسیر عمومی منتقل نمی‌شود؛ فقط داده‌های پاک‌سازی‌شده و بسته‌بندی‌شده باید منتشر شوند.

## زیرساخت
Docker از build چندمرحله‌ای Node/Vite و Nginx استفاده می‌کند. سرویس روی پورت 8080 و health check در /healthz باقی می‌ماند.