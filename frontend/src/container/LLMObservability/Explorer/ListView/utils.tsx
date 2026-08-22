import ROUTES from 'constants/routes';
import { formUrlParams } from 'container/TraceDetail/utils';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { formatCellValue, TraceListRow } from '../tableUtils';

/** Rows carry the span's attributes plus `date` (the list item's timestamp). */
export const transformDataWithDate = (data: QueryDataV3[]): TraceListRow[] =>
	data[0]?.list?.map(({ data, timestamp }) => ({ ...data, date: timestamp })) ||
	[];

export const getTraceLink = (record: TraceListRow): string =>
	`${ROUTES.TRACE}/${formatCellValue(record.traceID || record.trace_id)}${formUrlParams(
		{
			spanId: record.spanID || record.span_id,
			levelUp: 0,
			levelDown: 0,
		},
	)}`;

/** Row identity: span id per row, trace id as the root-only fallback. */
export const getTraceRowKey = (record: TraceListRow): string =>
	formatCellValue(
		record?.spanID ?? record?.span_id ?? record?.traceID ?? record?.trace_id,
	);
