# SHAD | Nabz — Product Intelligence Dashboard

Persian RTL business-intelligence dashboard for Shad product and operational data.

## Data coverage
- 115 source files: 108 CSV and 7 Excel workbooks.
- 213 extracted tables/sheets.
- 176,219 packaged records (the EventApiLog table is intentionally privacy-aggregated from 1,000 source rows to 3 date/status aggregates).
- Jalali date labels are preserved; missing values are not silently converted to zero.
- Event logs and Tamasha login audit fields are privacy-filtered before display.

## Modules
Executive overview, Messenger, Tamasha, Search, Traffic and Revenue, Support, Quality and Operations, Growth and Stores, Advanced Analytics, and Data Catalog / Explorer.

## Hadadi chart selection
18 charts: retention and calendar heatmaps, distributions, control charts, scatter relationships, correlation matrix, Pareto, treemap, and sunburst. Statistical alerts and forecasts are exploratory, not causal or operational guarantees.

## Runtime
Nginx static site in Docker. Port 80. `data.json.gz` is decompressed in the browser; `advanced.json` contains the selected Hadadi chart series. Railway auto-deploys from the connected GitHub repository.
