# SHAD | Nabz — Chart Audit

Audit date: 2026-11-27  
Reference implementation: `main` branch / Railway service `shad-nabz-dashboard`  
Source package: 115 files (108 CSV, 7 Excel workbooks), 213 tables/sheets.

## Scope and method

- Inspected the deployed dashboard's source implementation, chart render calls, data-source mappings, axis/unit formatting, time-window logic, and advanced chart transformations.
- Cross-checked the supplied source workbook/CSV package for the main plotted metrics and key totals.
- The dashboard has 32 primary chart render targets and 18 advanced chart definitions (50 total).
- Advanced chart definitions now contain metadata only. Their series are rebuilt at runtime from `DATA.tables`; no precomputed sample series remain in `advanced.json`.
- This is a source/code and source-data audit. A full browser screenshot pass at desktop/tablet/mobile widths remains a separate visual verification step; no screenshot-based claim is made here.

## Fixes applied

1. **Shared date windows:** line charts now select the last N unique calendar dates across all displayed series, rather than taking N rows independently per series.
2. **Missing observations:** SVG line paths break at missing dates instead of drawing a continuous line across a data gap.
3. **Scale mismatch:** comparisons with substantially different magnitudes now use an explicitly labelled index (first observation = 100), rather than compressing the smaller series against the larger one.
4. **Jalali heatmap key:** single-series calendar heatmaps now normalize `YYYY/MM/DD` to `YYYY-MM-DD` before looking up cells. The old key construction could leave valid days blank.
5. **Zero is data:** observed-date cutoffs now treat numeric zero as a valid observation. This prevents legitimate zero-valued final days from being discarded.
6. **Latest category date:** label-based charts and TopSearches now use the same corrected observed-date cutoff.
7. **Moderation zeros:** zero-valued content-moderation categories are retained in the chart instead of being silently omitted.
8. **Traffic share:** the MCI share KPI now reads `MCI_traffic_share` and displays a percentage, rather than labelling an absolute GB amount as a share.
9. **Search unit:** TopSearches bars say “جست‌وجو” rather than “عبارت” for a count field.
10. **Support KPI:** the response-time metric is labelled “میانگین زمان پاسخ”.
11. **Control charts:** the former full-history global mean/standard-deviation bands have been replaced by rolling bands based on the previous 30 observations. The note explicitly says this is exploratory and does not replace a process-control chart adjusted for trend and seasonality.
12. **Advanced chart presentation:** the 18 advanced chart definitions are rendered with the dashboard's custom SVG renderer; numeric ticks use compact Persian units and chart values remain source-backed.
13. **Shared React Sparkline:** all primary time-series line-chart targets and the overview revenue/activity trend cards now mount `src/components/ui/sparkline.tsx`. The component uses pure SVG at measured pixel dimensions (ResizeObserver, no viewBox), no axes, oldest-on-right/newest-on-left geometry, a latest-value dot, Persian number formatting, Jalali month labels, full-value tooltips, and first-to-last percentage summaries.
14. **RTL chart geometry:** advanced time-series, heatmap and scatter charts now reverse chronological geometry so time moves leftward; value labels sit at the right edge. Horizontal bar tracks fill from right to left with labels on the right.
15. **Shared theme palette:** chart series colors are resolved from `--chart-1` through `--chart-8`, with semantic fallbacks; chart components no longer define per-series hex colors.
16. **Accessible chart controls:** Sparkline and advanced charts expose screen-reader tables with raw series/date/value rows. Their legend buttons use `aria-pressed`, support toggling, and prevent hiding the last visible series. Sparkline keyboard navigation supports ArrowLeft/ArrowRight, Home/End and Escape, with the active value announced through aria-live.
17. **Currency display:** revenue values stored in Rial are converted by dividing by 10 and displayed in Toman in the traffic and overview revenue panels; raw catalog/explorer source values remain unchanged.
18. **Persian UI details:** chart values use Persian digits and the Persian thousands separator; tooltips show full values, compact labels use هزار/میلیون/میلیارد, date labels use Jalali month names, and reduced-motion preferences disable chart entry animation.

## Source-data cross-checks

| Check | Source values | Result |
|---|---:|---|
| Platform composition, 1405/09/03 | Android 8,895,900 + Web 207,750 + PWA 107,450 = Total 9,211,100 | Exact reconciliation |
| Android version shares, 1405/09/03 | 45.04 + 39.40 + 7.95 + 3.53 + 3.38 + 0.68 = 99.98% | 0.02 percentage-point rounding gap |
| Traffic products, 1405/08/29 | Sum of five product GB columns = 281,962.584468 GB | Matches all-services total |
| Traffic operators, 1405/08/29 | Sum of MCI, MTN, Rightel and Other = 281,962.584468 GB | Matches all-services total |
| Product revenue, 1405/08/29 | Sum of five product revenue columns = 3,768,623,883.27 Rial | Matches all-services revenue |
| Call center, 1405/08/29 | 370 answered / 376 incoming = 98.4043% | Matches stored rate 0.984043 |
| Tamasha, 1405/08/30 | ActiveUsers 519,600; ViewPost 21,679,800; LikePost 249,390; AddPost 1,680; FollowRequest 85,790; Unfollow 34,090 | Matches source rows |
| Infrastructure, 1405/08/29 | Country traffic 383 TB | Matches Page1 - TB |
| Support reasons, 1405/08/18 | 1,200 calls in 56 rows for the latest date in the supplied workbook | Source aggregation check |

### Items requiring interpretation, not silent correction

- Latest DailyRetention bucket values sum to 6,132,600, while DailyActivity is 6,127,200 on 1405/09/03 (difference 5,400; about 0.088%). The dashboard keeps these as separate source metrics. Their definitions/overlap should be confirmed with the data owner before treating the buckets as a strict partition of DailyActivity.
- CheckFileEntry, CheckFileChecked, CheckFileError, CheckFileHighConfidence, CheckFileNotChecked and FileTag series in the supplied source stop at 1404/10/29, while the overall snapshot is 1405/09/03. They are historical/stale, not current operational values. The quality section now exposes the old source date rather than implying freshness.
- Support reason details stop at 1405/08/18; Callcenter SL runs through 1405/08/29. Different modules do not share one universal latest date.
- Zero is retained as a real value. A zero does not mean “missing”; missing cells remain distinct from zero.

## Primary charts (32)

| Chart ID | Source table(s) | Meaning / unit |
|---|---|---|
| overviewActivity | Messenger_statistics/DailyActivity | Daily activity count |
| overviewMessages | Messenger_statistics/NewMessage | New messages count |
| platformBars | Messenger_statistics/PlatformActivity | Platform counts; Total excluded from component bars |
| retentionBars | Messenger_statistics/DailyRetention | Count by source label |
| messengerActivityChart | DailyActivity + LoginUser | Relative index, first observation = 100 |
| messengerMessageChart | NewMessage + ForwardMessage | Relative index, first observation = 100 |
| channelChart | JoinChannel + LeaveChannel | Daily counts |
| groupChart | JoinGroup + LeaveGroup | Relative index, first observation = 100 |
| androidVersionBars | AndroidVersionsActivity | Percentage share |
| messengerRetentionBars | DailyRetention | Count by retention label |
| tamashaActiveChart | Tamasha ActiveUsers | Active-user count |
| tamashaEngagementChart | ViewPost + LikePost | Relative index, first observation = 100 |
| tamashaGrowthChart | AddPost + FollowRequest + Unfollow | Relative index, first observation = 100 |
| moderationBars | TotalCheck*, TotalOk*, TotalError*, TotalHighConfidence* | Source counts; zero categories retained |
| searchRankBars | Messenger_statistics/TopSearches | Search count by ranked phrase |
| queryTrendChart | Messenger_statistics/TopSearches | Search count over time |
| productTrafficBars | Traffic_V2 | Product traffic, GB |
| operatorTrafficBars | Traffic_V2 | Operator traffic, GB |
| trafficTrendChart | Traffic_V2 | All-services traffic, GB |
| productRevenueBars | Traffic_V2 | Product revenue, Rial |
| answerRateChart | Callcenter SL | Answer rate, percent |
| callVolumeChart | Callcenter SL | Incoming and answered calls |
| callReasonBars | shad beat.xlsx / Call Reason | Current-week call count |
| detailedCallReasonBars | callReasons.xlsx / Sheet1 | Calls grouped by srlevel3 on latest date |
| policyBars | Messenger PolicyNoBan/PolicyLimitBan/PolicyFullBan | Counts |
| fileCheckBars | Messenger CheckFile* tables | Counts |
| fileTrendChart | RequestFile + UploadedFile | File request/upload counts |
| fileTagBars | FileTagHigh/Medium/Low/None | Counts |
| installChart | Bazar_newInstall | New installs |
| ratingChart | Bazar_averageRate + Myket_AVG_new_rate + Shaad_in_Bazaar | Ratings on shared rating scale |
| productUsersBars | shad beat.xlsx / active user | Product DAU |
| bestEventsBars | shad beat.xlsx / Best_Events | Current-week event counts |

## Advanced charts (18)

| Chart ID | Live source mapping | Chart type |
|---|---|---|
| Messenger-24 | Messenger_statistics/DailyRetention (date, label, value_num) | Jalali retention heatmap |
| Messenger-26 | Messenger_statistics/DailyActivity | Calendar heatmap |
| Messenger-27 | Messenger_statistics/NewMessage | Distribution / box |
| Messenger-28 | Messenger_statistics/CheckFileError | Rolling anomaly monitor; source stale after 1404/10/29 |
| Messenger-30 | Messenger_statistics/DailyActivity | Rolling anomaly monitor |
| Messenger-31 | DailyActivity + NewMessage | Same-date scatter |
| Tamasha-18 | Tamasha_statistics/ActiveUsers | Calendar heatmap |
| Tamasha-19 | Tamasha_statistics/ViewPost | Distribution / box |
| Tamasha-20 | TotalProcessErrorPosts + TotalProcessErrorVideos | Combined error count trend |
| Tamasha-22 | ActiveUsers + ViewPost | Same-date scatter |
| Infrastructure-16 | Mr_JafarGholi_report.xlsx / Page1 - TB / country traffic TB | Distribution / box |
| Infrastructure-17 | Same source/field | Rolling anomaly monitor |
| Support-9 | callReasons.xlsx / Sheet1; group by srlevel2 + srlevel3, sum calls | Pareto |
| Support-10 | Same source aggregation | Treemap |
| Support-11 | Same source aggregation | Sunburst |
| Analytics-1 | DailyActivity, NewMessage, NewUser, DeleteAccount, CallMessage, CheckFileError, JoinGroup, ForwardMessage | Correlation of same-period first differences |
| Analytics-5 | DailyActivity | Histogram |
| Analytics-8 | NewMessage | Histogram |

## Verification status

- TypeScript and production bundle: passed on Railway (`tsc -b && vite build`; Vite reported 35 modules transformed and build completed).
- Advanced definitions: 18 present; 0 embedded series remain.
- Source table/field mappings for all 18 advanced charts: checked against the supplied CSV/Excel schemas.
- Main chart call sites: 32 found and mapped to source tables.
- Railway production: deployment `eebb3f47-fd10-4ff3-845c-abeb4ace3434` reached terminal `SUCCESS` on 2026-11-27; deployed Git commit `ac46c026e03fe1b0016ee98f527ee1baa1718dfc`.
- A desktop/tablet/mobile screenshot review remains a separate visual QA step; the deployment result is not presented as a screenshot-based visual sign-off.
