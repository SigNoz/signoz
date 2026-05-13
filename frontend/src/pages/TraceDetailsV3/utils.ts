import { SpanV3 } from 'types/api/trace/getTraceV3';

/**
 * Look up an attribute from both `resource` and `attributes` on a span.
 * Resources are checked first (service.name, k8s.* etc. live there).
 *
 * Accepts both `SpanV3` (waterfall) and `FlamegraphSpan` (flamegraph) by typing
 * structurally — the only fields touched are `resource` and `attributes`.
 *
 * TODO: Remove tagMap fallback when phasing out V2
 */
export function getSpanAttribute(
	span: {
		resource?: Record<string, string>;
		attributes?: Record<string, any>;
	},
	key: string,
): string | undefined {
	return (
		span.resource?.[key] || span.attributes?.[key] || (span as any).tagMap?.[key]
	);
}

const INFRA_METADATA_KEYS = [
	'k8s.cluster.name',
	'k8s.pod.name',
	'k8s.node.name',
	'host.name',
] as const;

/**
 * Check if span has infrastructure metadata (k8s/host).
 * TODO: Remove tagMap fallback when phasing out V2
 */
export function hasInfraMetadata(span: SpanV3 | undefined): boolean {
	if (!span) {
		return false;
	}
	return INFRA_METADATA_KEYS.some((key) => getSpanAttribute(span, key));
}

// Top-level fields that exist on the API response only to support waterfall
// rendering. They have no value in the Span Details DataViewer. Drop the whole
// constant + helper once the backend stops emitting them.
const HIDDEN_SPAN_FIELDS_IN_DETAILS_VIEW: ReadonlySet<string> = new Set([
	'sub_tree_node_count',
	'has_children',
	'level',
	'service.name',
]);

/**
 * Shallow-copies the span with waterfall-only fields stripped, for display in
 * the Span Details DataViewer.
 */
export function getSpanDisplayData(span: SpanV3): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(span)) {
		if (!HIDDEN_SPAN_FIELDS_IN_DETAILS_VIEW.has(key)) {
			result[key] = value;
		}
	}
	return result;
}

/**
 * V3 pinned-attribute entries are JSON-stringified arrays (e.g.
 * `'["attributes","http.method"]'`). Legacy V2 entries are flat strings.
 * Used to distinguish V3 from V2 entries when reading the persisted value.
 */
export function isV3PinnedAttribute(entry: string): boolean {
	try {
		return Array.isArray(JSON.parse(entry));
	} catch {
		return false;
	}
}
