import { SpanV3 } from 'types/api/trace/getTraceV3';

/**
 * Look up an attribute from both `resource` and `attributes` on a span.
 * Resources are checked first (service.name, k8s.* etc. live there).
 * TODO: Remove tagMap fallback when phasing out V2
 */
export function getSpanAttribute(
	span: SpanV3,
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
