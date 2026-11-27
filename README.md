# SHAD | Nabz — Product Intelligence Dashboard

Persian RTL business-intelligence dashboard for Shad product and operational data.

## Data coverage
- 115 source files: 108 CSV and 7 Excel workbooks.
- 213 extracted tables/sheets.
- 176,219 packaged records.
- The 1,000-row EventApiLog source (which contains phone numbers and national IDs) is not published row-by-row: it is reduced to 3 date/status aggregates. The Tamasha login audit table omits usernames and error-message text.
- 39 entirely blank spreadsheet rows are excluded from the packaged record count.
- Jalali date labels are preserved; missing values are not silently converted to zero.

## Modules
Executive overview, Messenger, Tamasha, Search, Traffic and Revenue, Support, Quality and Operations, Growth and Stores, Advanced Analytics, and Data Catalog / Explorer.

## Hadadi chart selection
18 selected charts: retention and calendar heatmaps, distributions, control charts, scatter relationships, correlation matrix, Pareto, treemap, and sunburst. Statistical alerts and forecasts are exploratory, not causal or operational guarantees.

## Runtime and security
- Nginx static site in Docker, listening on port 8080.
- data.json.gz is decompressed in the browser; advanced.json contains the selected Hadadi chart series.
- Railway must define DASHBOARD_USER and DASHBOARD_PASSWORD. The startup script creates a bcrypt-protected Nginx Basic Auth file; passwords shorter than 16 characters are rejected.
- /healthz is an unauthenticated health endpoint; dashboard pages and data files require authentication.
- Railway auto-deploys from the connected GitHub repository.

## Important repository visibility note
If this repository is public, GitHub also serves data.json.gz and advanced.json publicly. Dashboard Basic Auth does not protect files hosted in a public GitHub repository. Set the repository to Private before using confidential operational data.
