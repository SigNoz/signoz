import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';
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
export function isBuilderOrAIEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): boolean {
	return BUILDER_ENVELOPE_TYPES.includes(envelope.type);
}

export function isAIBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): boolean {
	return (
		envelope.type ===
		Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query
	);
}

const BUILDER_PLUGIN_KINDS: string[] = [
	DashboardtypesQueryPluginKindDTO['signoz/BuilderQuery'],
	DashboardtypesQueryPluginKindDTO['signoz/AIBuilderQuery'],
];

/** True for a bare `signoz/BuilderQuery` or `signoz/AIBuilderQuery`. CompositeQuery is not included. */
export function isBuilderOrAIPluginKind(kind: string): boolean {
	return BUILDER_PLUGIN_KINDS.includes(kind);
}
