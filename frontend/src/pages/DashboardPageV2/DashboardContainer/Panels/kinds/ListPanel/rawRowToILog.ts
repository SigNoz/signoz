import { isPlainObject } from 'lodash-es';
import type { RawTableRow } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareRawTable';
import type { ILog } from 'types/api/logs/log';
import { toFiniteNumber } from 'utils/numericUtils';
import { coerceToString } from 'utils/stringUtils';

// Map-typed fields the LogDetail drawer iterates with `Object.keys` (resource
// filters, attribute/scope tabs). Default to `{}` so a row missing one (or a
// flattened row) never trips `Object.keys(undefined)`.
const MAP_FIELDS = [
	'resources_string',
	'attributes_string',
	'attributes_number',
	'attributes_bool',
	'scope_string',
] as const;

/**
 * Best-effort projection of a V5 raw log row into the `ILog` shape the shared
 * `LogDetail` drawer consumes. The raw row already carries the log's fields
 * flattened onto the top level; we surface the canonical aliases the drawer
 * reads and pass everything else through. `id`-less rows fall back to the
 * synthetic table key so navigation/active-log tracking stays stable.
 */
export function rawRowToILog(row: RawTableRow): ILog {
	const data = row as Record<string, unknown>;
	const severityText = data.severity_text ?? data.severityText;
	const severityNumber = data.severity_number ?? data.severityNumber;
	const traceId = data.trace_id ?? data.traceId;
	const spanId = data.span_id ?? data.spanID;

	const maps = Object.fromEntries(
		MAP_FIELDS.map((field) => [
			field,
			isPlainObject(data[field]) ? data[field] : {},
		]),
	);

	return {
		...data,
		...maps,
		id: coerceToString(data.id ?? row.key),
		timestamp: (data.timestamp as string | number) ?? '',
		date: coerceToString(data.timestamp),
		body: (data.body as ILog['body']) ?? '',
		severityText: coerceToString(severityText),
		severity_text: coerceToString(severityText),
		severityNumber: toFiniteNumber(severityNumber),
		severity_number: toFiniteNumber(severityNumber),
		traceId: coerceToString(traceId),
		trace_id: coerceToString(traceId),
		spanID: coerceToString(spanId),
		span_id: coerceToString(spanId),
	} as ILog;
}
