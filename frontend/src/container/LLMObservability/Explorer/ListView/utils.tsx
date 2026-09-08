import type { TracesTableRow } from '../TracesTable/getFieldColumn';
import ROUTES from 'constants/routes';
import { formUrlParams } from 'container/TraceDetail/utils';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export const getTraceLink = (record: Record<string, unknown>): string => {
	function readId(value: unknown): string {
		if (typeof value === 'string' || typeof value === 'number') {
			return String(value);
		}
		return '';
	}

	const traceId = readId(record.traceID) || readId(record.trace_id);
	const spanId = readId(record.spanID) || readId(record.span_id);

	return `${ROUTES.TRACE}/${traceId}${formUrlParams({
		spanId,
		levelUp: 0,
		levelDown: 0,
	})}`;
};

// `id` mirrors span_id so TanStack sees real row changes on orderBy toggles.
export const transformSpanRows = (data: QueryDataV3[]): TracesTableRow[] => {
	const list = data[0]?.list;
	if (!list) {
		return [];
	}
	return list.map((item) => {
		const row = item.data as Record<string, unknown>;
		return {
			...row,
			timestamp: item.timestamp,
			id: row.span_id,
		};
	}) as TracesTableRow[];
};
