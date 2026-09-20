import type { Querybuildertypesv5QueryEnvelopeDTO } from 'api/generated/services/sigNoz.schemas';
import {
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
