import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { QueryType } from 'types/api/v5/queryRange';
import type { EQueryType } from 'types/common/dashboard';

/**
 * The query-authoring modes a panel kind can offer, one per editor tab. Three are query
 * languages (`EQueryType`); the fourth is the AI query builder, which is a builder query
 * under the hood and so has no `EQueryType` of its own — it is keyed by the v5 query type
 * stamped on each of its queries (`IBuilderQuery.builderQueryType`), which is what lets
 * the active tab be read straight off the query.
 */
export type PanelQueryMode =
	| EQueryType
	| Extract<QueryType, 'builder_ai_query'>;

/** The AI query builder's mode key. */
export const AI_QUERY_MODE = 'builder_ai_query' as const;

/**
 * What a mode authors: a set of signals, or nothing signal-shaped at all. ClickHouse and
 * PromQL are raw query text and carry no signal, which is a different statement from "this
 * mode takes an empty set of signals" — the union makes the two unconfusable.
 */
export type QueryModeCapability =
	| { kind: 'signal'; signals: TelemetrytypesSignalDTO[] }
	| { kind: 'signal-less' };

/**
 * Every mode a kind offers, with what each one authors. Partial on purpose: an absent key
 * means the kind does not offer that mode at all (no tab, and the kind is disabled while that
 * mode is active), which is how List opts out of everything but the builder.
 *
 * Declaring modes and signals together is what keeps them interoperable: AI is traces-only on
 * a kind whose builder mode also takes logs and metrics — which two independent lists can't
 * express.
 */
export type SupportedQueryModes = Partial<
	Record<PanelQueryMode, QueryModeCapability>
>;

/** Declaration order, which puts the builder first. */
export function listQueryModes(modes: SupportedQueryModes): PanelQueryMode[] {
	return Object.keys(modes) as PanelQueryMode[];
}

/** The modes that are query languages, for call sites on the legacy `queryType` axis. */
export function listQueryTypes(modes: SupportedQueryModes): EQueryType[] {
	return listQueryModes(modes).filter(
		(mode): mode is EQueryType => mode !== AI_QUERY_MODE,
	);
}

/** Signals authorable in `mode`, or across every mode when none is given. */
export function signalsForMode(
	modes: SupportedQueryModes,
	mode?: PanelQueryMode,
): TelemetrytypesSignalDTO[] {
	if (mode) {
		const capability = modes[mode];
		return capability?.kind === 'signal' ? capability.signals : [];
	}
	const all = Object.values(modes).flatMap((capability) =>
		capability?.kind === 'signal' ? capability.signals : [],
	);
	return [...new Set(all)];
}
