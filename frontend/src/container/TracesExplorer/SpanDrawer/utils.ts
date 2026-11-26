import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { SpanV3 } from 'types/api/trace/getTraceV3';

type ListSpanEvent = {
	name: string;
	timeUnixNano: number;
	attributes?: Record<string, string>;
	isError?: boolean;
};

type ListSpanLink = { traceId: string; spanId: string };

/**
 * The list API returns a span in a different shape from the trace API the
 * details panel was built on: an ISO timestamp, `attributes` on events, and
 * `links` in place of `references`.
 */
export const toSpanV3 = (row: TracesTableRow): SpanV3 => {
	const resource = (row.resource ?? {}) as Record<string, string>;
	const events = (row.events ?? []) as ListSpanEvent[];
	const links = (row.links ?? []) as ListSpanLink[];

	return {
		...row,
		timestamp: new Date(row.timestamp as string).getTime(),
		'service.name': resource['service.name'] ?? '',
		events: events.map(({ attributes, isError, ...event }) => ({
			...event,
			attributeMap: attributes ?? {},
			isError: isError ?? false,
		})),
		// The list API drops `refType`, so the parent ref is matched by id. A root
		// span's parent ref has no span id.
		references: links.filter(
			(link) =>
				!!link.spanId &&
				(link.spanId !== row.parent_span_id || link.traceId !== row.trace_id),
		),
	} as unknown as SpanV3;
};
