import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelDefinition } from './registry';
import type { FilterConfigsPartial } from './types/panelCapabilities';
import type { PanelKind } from './types/panelKind';

/**
 * The single deterministic guard for V2 dashboards. Every "what works with what"
 * question — panel kind × query type × signal, and which query-builder fields a kind
 * hides — is answered here by reading each kind's declared capabilities from the panel
 * registry. Adding a new kind means declaring its capabilities once in its definition;
 * these functions then cover it automatically. Pure and side-effect free.
 */

/** Signals a kind can visualize. */
export function getSupportedSignals(
	kind: PanelKind,
): TelemetrytypesSignalDTO[] {
	return getPanelDefinition(kind).supportedSignals;
}

export function isSignalSupported(
	kind: PanelKind,
	signal: TelemetrytypesSignalDTO,
): boolean {
	return getSupportedSignals(kind).includes(signal);
}

/** Query languages a kind supports (Query Builder / ClickHouse / PromQL). */
export function getSupportedQueryTypes(kind: PanelKind): EQueryType[] {
	return getPanelDefinition(kind).supportedQueryTypes;
}

export function isQueryTypeSupported(
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
	if (!isQueryTypeSupported(kind, queryType)) {
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
	return supported.includes(preferred) ? preferred : supported[0];
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
	const rule = getPanelDefinition(kind).queryBuilderFields;
	const perSignal = signal ? rule[signal] : undefined;
	return { ...rule.default, ...perSignal };
}
