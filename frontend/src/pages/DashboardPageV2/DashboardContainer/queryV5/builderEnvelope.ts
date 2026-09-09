import type {
	Querybuildertypesv5OrderByDTO,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTO,
	Querybuildertypesv5QueryEnvelopeBuilderDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
	Querybuildertypesv5StepDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
} from 'api/generated/services/sigNoz.schemas';

/**
 * A builder query on the wire, in either flavour. `builder_ai_query` is the same
 * builder spec pinned to traces — it differs from `builder_query` only in the
 * envelope tag, so every "is this a builder query?" decision must accept both.
 */
export type BuilderEnvelope =
	| Querybuildertypesv5QueryEnvelopeBuilderDTO
	| Querybuildertypesv5QueryEnvelopeBuilderAIDTO;

export const BUILDER_ENVELOPE_TYPES: readonly Querybuildertypesv5QueryEnvelopeDTO['type'][] =
	[
		Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
		Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query,
	];

/**
 * The single predicate for "this envelope carries a builder query". Use it instead of
 * comparing `type` to the `builder_query` literal: a bare literal silently excludes AI
 * queries, which is how an AI panel ends up with no legends, no signal and an
 * un-widened bar step interval.
 */
export function isBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): envelope is BuilderEnvelope {
	return BUILDER_ENVELOPE_TYPES.includes(envelope.type);
}

/** Whether an envelope is specifically the AI flavour (traces-only, AI-authored). */
export function isAIBuilderEnvelope(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): envelope is Querybuildertypesv5QueryEnvelopeBuilderAIDTO {
	return (
		envelope.type ===
		Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query
	);
}

/**
 * The request-time fields the query-range builder stamps onto a builder spec. Orval
 * types the AI envelope's `spec` as the traces aggregation alone and the plain one as
 * the three-signal union, so a spec rebuilt in place fits neither without narrowing —
 * this is the shared shape of what those rewrites actually write.
 */
export interface BuilderSpecPatch {
	stepInterval?: Querybuildertypesv5StepDTO;
	order?: Querybuildertypesv5OrderByDTO[] | null;
	offset?: number;
	limit?: number;
}

/**
 * Merges `patch` into a builder envelope's spec, preserving the envelope's own type —
 * so a `builder_ai_query` stays one instead of being flattened back to `builder_query`.
 */
export function withBuilderSpec<T extends BuilderEnvelope>(
	envelope: T,
	patch: BuilderSpecPatch,
): T {
	return { ...envelope, spec: { ...envelope.spec, ...patch } } as T;
}
