import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesQueryPluginKindDTO,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
} from 'api/generated/services/sigNoz.schemas';

/**
 * The envelope types that carry a builder query spec. `builder_ai_query` is an AI
 * observability traces query authored in the AI query builder; it differs from
 * `builder_query` only in which field endpoints and statement builder the backend uses, so
 * everything downstream — legends, aggregation metadata, step interval, variables, paging —
 * must treat the two alike. Formula and TraceOperator are deliberately absent: they carry no
 * signal and reference other queries by name.
 */
const BUILDER_ENVELOPE_TYPES: string[] = [
	Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query,
];

export function isBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): boolean {
	return BUILDER_ENVELOPE_TYPES.includes(envelope.type);
}

/** Authored in the AI query builder — the tag rides on the envelope, not the spec. */
export function isAIBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): boolean {
	return (
		envelope.type ===
		Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query
	);
}

/**
 * The plugin kinds that carry a builder query spec directly, without a CompositeQuery
 * wrapper — the plugin-level twin of `isBuilderEnvelope`. The editor only ever writes a
 * bare plugin for List panels, but a dashboard imported from JSON or created over the API
 * may use one for any panel kind, so read paths must accept both.
 */
const BUILDER_PLUGIN_KINDS: string[] = [
	DashboardtypesQueryPluginKindDTO['signoz/BuilderQuery'],
	DashboardtypesQueryPluginKindDTO['signoz/AIBuilderQuery'],
];

export function isBuilderPluginKind(kind: string): boolean {
	return BUILDER_PLUGIN_KINDS.includes(kind);
}
