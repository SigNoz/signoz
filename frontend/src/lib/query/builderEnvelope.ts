import type {
	Querybuildertypesv5QueryEnvelopeBuilderAIDTO,
	Querybuildertypesv5QueryEnvelopeBuilderDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesQueryPluginKindDTO,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
} from 'api/generated/services/sigNoz.schemas';

const BUILDER_ENVELOPE_TYPES: string[] = [
	Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query,
];

/** True for `builder_query` and `builder_ai_query`. Formulas and trace operators are excluded. */
export function isBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): envelope is
	| Querybuildertypesv5QueryEnvelopeBuilderDTO
	| Querybuildertypesv5QueryEnvelopeBuilderAIDTO {
	return BUILDER_ENVELOPE_TYPES.includes(envelope.type);
}

export function isAIBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): envelope is Querybuildertypesv5QueryEnvelopeBuilderAIDTO {
	return (
		envelope.type ===
		Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query
	);
}

const BUILDER_PLUGIN_KINDS: string[] = [
	DashboardtypesQueryPluginKindDTO['signoz/BuilderQuery'],
	DashboardtypesQueryPluginKindDTO['signoz/AIBuilderQuery'],
];

/**
 * True for a bare `signoz/BuilderQuery` or `signoz/AIBuilderQuery` plugin (the form List
 * panels use). Inside a CompositeQuery an AI query is a `builder_ai_query` envelope, matched
 * by `isBuilderEnvelope`.
 */
export function isBuilderPluginKind(kind: string): boolean {
	return BUILDER_PLUGIN_KINDS.includes(kind);
}
