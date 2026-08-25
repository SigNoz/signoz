import { formatCellValue, TraceListRow } from '../tableUtils';

/** Row identity for root spans: one row per trace; tolerates skeleton rows. */
export const getRootSpanRowKey = (record: TraceListRow): string =>
	formatCellValue(record?.trace_id ?? record?.traceID);
