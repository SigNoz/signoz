import { formatCellValue, TraceListRow } from '../tableUtils';

/**
 * Row identity for the root-span table: one row per trace. Tolerates the
 * skeleton placeholder rows the table renders before the first response.
 */
export const getRootSpanRowKey = (record: TraceListRow): string =>
	formatCellValue(record?.trace_id ?? record?.traceID);
