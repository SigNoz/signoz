import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelDefinition } from './registry';
import {
	mergeQueryBuilderFieldRule,
	type FilterConfigsPartial,
} from './types/panelCapabilities';
import type { RenderableQueryPanelDefinition } from './types/panelDefinition';
import type { PanelKind } from './types/panelKind';
import {
	listQueryModes,
	listQueryTypes,
	signalsForMode,
	type PanelQueryMode,
} from './types/queryModes';

/**
 * The single deterministic guard for V2 dashboards. Every "what works with what"
 * question — panel kind × query mode × signal, and which query-builder fields a kind
 * hides — is answered here by reading each kind's declared capabilities from the panel
 * registry. Adding a new kind means declaring its capabilities once in its definition;
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

/** Every mode this kind offers, in declaration order (the builder first). */
export function getSupportedQueryModes(kind: PanelKind): PanelQueryMode[] {
	const definition = getQueryPanelDefinition(kind);
	return definition ? listQueryModes(definition.supportedQueryModes) : [];
}

export function isQueryModeSupportedByPanelKind(
	kind: PanelKind,
	mode: PanelQueryMode,
): boolean {
	return getSupportedQueryModes(kind).includes(mode);
}

/**
 * Signals a kind can visualize — in `mode` when one is given, else across every mode it
 * offers. The mode-scoped form is what keeps the two axes interoperable: the AI mode
 * authors traces only, on a kind whose builder mode also takes logs and metrics.
 */
export function getSupportedSignals(
	kind: PanelKind,
	mode?: PanelQueryMode,
): TelemetrytypesSignalDTO[] {
	const modes = getQueryPanelDefinition(kind)?.supportedQueryModes;
	return modes ? signalsForMode(modes, mode) : [];
}

export function isSignalSupported(
	kind: PanelKind,
	signal: TelemetrytypesSignalDTO,
	mode?: PanelQueryMode,
): boolean {
	return getSupportedSignals(kind, mode).includes(signal);
}

/**
 * Query languages a kind supports (Query Builder / ClickHouse / PromQL) — its modes
 * minus the AI one, for the call sites that speak the legacy `queryType` axis.
 */
export function getSupportedQueryTypes(kind: PanelKind): EQueryType[] {
	const definition = getQueryPanelDefinition(kind);
	return definition ? listQueryTypes(definition.supportedQueryModes) : [];
}

export function isQueryTypeSupportedByPanelKind(
	kind: PanelKind,
	queryType: EQueryType,
): boolean {
	return getSupportedQueryTypes(kind).includes(queryType);
}

/**
 * Master guard: is this panel kind renderable in this mode (and, where the mode carries
 * a signal, with this signal)? ClickHouse/PromQL queries carry no signal, so the signal
 * is validated only when one is given.
 */
export function isPanelCombinationValid({
	kind,
	mode,
	signal,
}: {
	kind: PanelKind;
	mode: PanelQueryMode;
	signal?: TelemetrytypesSignalDTO;
}): boolean {
	// A query-less kind ignores the query entirely, so it pairs with anything.
	if (isStaticPanelKind(kind)) {
		return true;
	}
	if (!isQueryModeSupportedByPanelKind(kind, mode)) {
		return false;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal, mode)) {
		return false;
	}
	return true;
}

/**
 * The mode to use for a kind given a `preferred` one: keep it if the kind offers it and
 * it admits the signal, otherwise fall back to the kind's first mode. Used when switching
 * panel kinds to coerce an unsupported active mode (PromQL → a List panel coerces to Query
 * Builder; AI → a kind with no AI mode does the same).
 */
export function resolveQueryMode(
	kind: PanelKind,
	preferred: PanelQueryMode,
	signal?: TelemetrytypesSignalDTO,
): PanelQueryMode {
	const supported = getSupportedQueryModes(kind);
	if (
		supported.includes(preferred) &&
		(signal === undefined || isSignalSupported(kind, signal, preferred))
	) {
		return preferred;
	}
	// A query-less kind has no modes; the builder is the neutral answer.
	return supported[0] ?? EQueryType.QUERY_BUILDER;
}

/** `resolveQueryMode` narrowed to the legacy `queryType` axis. */
export function resolveQueryType(
	kind: PanelKind,
	preferred: EQueryType,
): EQueryType {
	const supported = getSupportedQueryTypes(kind);
	return supported.includes(preferred)
		? preferred
		: (supported[0] ?? EQueryType.QUERY_BUILDER);
}

/**
 * Query-builder field visibility for a kind + signal: the kind's `default` rule with
 * its per-signal overrides merged over it (signal wins). `{}` when the kind hides
 * nothing, i.e. the builder shows every field.
 */
export function getHiddenQueryBuilderFields(
	kind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): FilterConfigsPartial {
	const rule = getQueryPanelDefinition(kind)?.queryBuilderFields ?? {};
	return mergeQueryBuilderFieldRule(rule, signal);
}
