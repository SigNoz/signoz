import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelDefinition } from './registry';
import {
	mergeQueryBuilderFieldRule,
	type FilterConfigsPartial,
} from './types/panelCapabilities';
import type { RenderableQueryPanelDefinition } from './types/panelDefinition';
import type { PanelKind } from './types/panelKind';

/**
 * The single deterministic guard for V2 dashboards. Every "what works with what"
 * question — panel kind × query type × signal, and which query-builder fields a kind
 * hides — is answered here by reading each kind's declared capabilities from the panel
 * registry. Adding a new kind means declaring its capabilities once in its definition;
 * these functions then cover it automatically. Pure and side-effect free.
 */

/** Renders from its own plugin spec — no query surface at all. */
export function isQuerylessPanelKind(kind: PanelKind): boolean {
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

/** Signals a kind can visualize. */
export function getSupportedSignals(
	kind: PanelKind,
): TelemetrytypesSignalDTO[] {
	return getQueryPanelDefinition(kind)?.supportedSignals ?? [];
}

export function isSignalSupported(
	kind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): boolean {
	return getSupportedSignals(kind).includes(signal);
}

/** Query languages a kind supports (Query Builder / ClickHouse / PromQL). */
export function getSupportedQueryTypes(kind: PanelKind): EQueryType[] {
	return getQueryPanelDefinition(kind)?.supportedQueryTypes ?? [];
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
	if (isQuerylessPanelKind(kind)) {
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
 * The query type to use for a kind given a `preferred` one: keep it if the kind
 * supports it, otherwise fall back to the kind's first supported type. Used when
 * switching panel kinds to coerce an unsupported active query type (e.g. PromQL → a
 * List panel coerces to Query Builder).
 */
export function resolveQueryType(
	kind: PanelKind,
	preferred: EQueryType,
): EQueryType {
	const supported = getSupportedQueryTypes(kind);
	if (supported.includes(preferred)) {
		return preferred;
	}
	// A query-less kind has no supported types; the builder is the neutral answer.
	return supported[0] ?? EQueryType.QUERY_BUILDER;
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
