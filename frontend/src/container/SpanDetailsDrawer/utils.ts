import { Span } from 'types/api/trace/getTraceV2';

/**
 * Infrastructure metadata keys that indicate infra signals are available
 */
export const INFRA_METADATA_KEYS = [
	'k8s.cluster.name',
	'k8s.pod.name',
	'k8s.node.name',
	'host.name',
] as const;

/**
 * Checks if a span has any infrastructure metadata attributes
 * @param span - The span to check for infrastructure metadata
 * @returns true if the span has at least one infrastructure metadata key, false otherwise
 */
export function hasInfraMetadata(span: Span | undefined): boolean {
	if (!span?.tagMap) return false;

	return INFRA_METADATA_KEYS.some((key) => span.tagMap?.[key]);
}
