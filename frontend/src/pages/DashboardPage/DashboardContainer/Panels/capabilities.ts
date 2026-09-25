import { type TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType, QueryMode } from 'types/common/dashboard';

import { getPanelDefinition } from './registry';
import { getQueryModeSignals } from './types/panelCapabilities';
import type { RenderableQueryPanelDefinition } from './types/panelDefinition';
import type { PanelKind } from './types/panelKind';

/**
 * The single deterministic guard for V2 dashboards. Every "what works with what"
 * question — panel kind × query type × signal — is answered here by reading each kind's
 * declared capabilities from the panel registry. Adding a new kind means declaring its
 * capabilities once in its definition;
 * these functions then cover it automatically. Pure and side-effect free.
 */

/** Renders from its own plugin spec — no query surface at all. */
export function isStaticPanelKind(kind: PanelKind): boolean {
	return getPanelDefinition(kind).mode === 'static';
}

/**
 * The kind's definition narrowed to the query arm, or null for a static kind.
 * The null is what hosts fork on; the accessors below fold it into "supports
 * nothing" for the guard questions.
 */
export function getQueryPanelDefinition(
	kind: PanelKind,
): RenderableQueryPanelDefinition | null {
	const definition = getPanelDefinition(kind);
	return definition.mode === 'query' ? definition : null;
}

/**
 * The query arm, asserted present. For call sites that a host mounts only after
 * narrowing `mode === 'query'` but that read the definition by kind rather than
 * receiving it as a prop — the throw makes that invariant executable instead of
 * silently null-tolerant.
 */
export function requireQueryPanelDefinition(
	kind: PanelKind,
): RenderableQueryPanelDefinition {
	const definition = getQueryPanelDefinition(kind);
	if (!definition) {
		throw new Error(
			`query machinery mounted for query-less panel kind ${kind} — the host must fork on definition.mode before this point`,
		);
	}
	return definition;
}

const DEFAULT_QUERY_MODE = QueryMode.QUERY_BUILDER;

/** Signals a kind can visualize in `mode`. */
export function getSupportedSignals(
	kind: PanelKind,
	mode: QueryMode = DEFAULT_QUERY_MODE,
): TelemetrytypesSignalDTO[] {
	return getQueryModeSignals(
		getQueryPanelDefinition(kind)?.supportedQueryModes,
		mode,
	);
}

export function isSignalSupported(
	kind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): boolean {
	return getSupportedSignals(kind).includes(signal);
}

/** Authoring modes a kind supports, in tab order. */
export function getSupportedQueryModes(kind: PanelKind): QueryMode[] {
	const modes = getQueryPanelDefinition(kind)?.supportedQueryModes ?? {};
	return Object.keys(modes) as QueryMode[];
}
/** Query languages a kind supports (Query Builder / ClickHouse / PromQL). */
export function getSupportedQueryTypes(kind: PanelKind): EQueryType[] {
	return getSupportedQueryModes(kind).filter(
		(mode): mode is EQueryType => mode !== QueryMode.AI_QUERY_BUILDER,
	);
}

export function isQueryTypeSupportedByPanelKind(
	kind: PanelKind,
	queryType: EQueryType,
): boolean {
	return getSupportedQueryTypes(kind).includes(queryType);
}

/**
 * Master guard: is this panel kind renderable with this query type (and, in builder
 * mode, this signal)? ClickHouse/PromQL queries carry no signal, so the signal is
 * validated only when one is given.
 */
export function isPanelCombinationValid({
	kind,
	queryType,
	signal,
}: {
	kind: PanelKind;
	queryType: EQueryType;
	signal?: TelemetrytypesSignalDTO;
}): boolean {
	// A query-less kind ignores the query entirely, so it pairs with anything.
	if (isStaticPanelKind(kind)) {
		return true;
	}
	if (!isQueryTypeSupportedByPanelKind(kind, queryType)) {
		return false;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal)) {
		return false;
	}
	return true;
}

/**
 * The authoring mode to use for a kind given a `preferred` one: keep it if the kind
 * supports it, otherwise fall back to the kind's first supported mode. Used when
 * switching panel kinds to coerce an unsupported active mode (e.g. PromQL → a List
 * panel coerces to Query Builder).
 */
export function resolveQueryMode(
	kind: PanelKind,
	preferred: QueryMode,
): QueryMode {
	const supported = getSupportedQueryModes(kind);
	if (supported.includes(preferred)) {
		return preferred;
	}
	// A query-less kind has no supported modes; the builder is the neutral answer.
	return supported[0] ?? DEFAULT_QUERY_MODE;
}
