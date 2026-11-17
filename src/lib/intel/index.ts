export { aggregateByMonth, buildIntelDashboard } from "./build";
export {
  DEMO_ROW_COUNT,
  EXCEL_DOMAINS,
  type ExcelDomainId,
  type ExcelDomainMeta,
} from "./excel-domains";
export {
  assertTemplateRowCounts,
  buildDemoWorkbook,
  parseIntelExcel,
  type ExcelParseResult,
  type ParsedExcelPatch,
} from "./excel";
export {
  buildReplenishmentAlerts,
  evaluateCover,
  MAX_COVER_MONTHS_BEFORE_REPLENISH,
  MIN_DEMAND_HISTORY_MONTHS,
  REPLENISH_TARGET_COVER_MONTHS,
} from "./replenishment";
export {
  defaultIntelSources,
  mergeIntelSources,
  type IntelSourceData,
  type IntelSourceKey,
  type MarginSkuRow,
} from "./sources";
export type * from "./types";
