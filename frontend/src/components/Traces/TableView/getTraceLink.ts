import ROUTES from 'constants/routes';
import { formUrlParams } from 'container/TraceDetail/utils';

// Reads camelCase OR snake_case at runtime — accepts any row shape that ships
// trace_id (and optionally span_id). Both the TanStack ListView's SpanRow and
// the legacy antd `RowData` (TracesTableComponent, EntityTraces) satisfy this.
export const getTraceLink = (record: Record<string, unknown>): string => {
	const traceId = readId(record.traceID) || readId(record.trace_id);
	const spanId = readId(record.spanID) || readId(record.span_id);
	return `${ROUTES.TRACE}/${traceId}${formUrlParams({
		spanId,
		levelUp: 0,
		levelDown: 0,
	})}`;
};

function readId(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number') {
		return String(value);
	}
	return '';
}
