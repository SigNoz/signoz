import type { DashboardtypesQueryDTO, Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryEnvelope, QueryType } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

import {
	type BarePluginKind,
	deriveOuterKind,
	wrapBare,
	wrapComposite,
} from './shared';

// QUERY_BUILDER single-envelope dispatch table: when the v5 forward conversion
// emits exactly one envelope, the envelope's `type` determines which bare
// perses plugin kind wraps it. Only builder_query bare-wraps — formulas and
// trace operators reference builder queries by name (e.g. "A + 1", "A && B")
// and can never exist alone, so they always travel inside a CompositeQuery
// alongside the builder query they reference.
const QUERY_BUILDER_BARE_KIND: Partial<Record<QueryType, BarePluginKind>> = {
	builder_query: 'signoz/BuilderQuery',
};

export interface ToPersesArgs {
	query: Query;
	graphType: PANEL_TYPES;
}

/**
 * Converts a V1 in-memory `Query` to the perses on-wire envelope used by V2
 * dashboards.
 *
 * Returns `[]` for genuinely-empty input, otherwise an array of length exactly
 * one (the perses backend invariant: `panel.queries.length === 1`).
 *
 * Phase 5: all six perses plugin kinds — BuilderQuery, Formula, TraceOperator,
 * CompositeQuery, PromQLQuery, ClickHouseSQL. PROM and CLICKHOUSE queryTypes
 * collapse to their bare envelopes on single-query input, composite otherwise.
 */
export function toPerses({
	query,
	graphType,
}: ToPersesArgs): DashboardtypesQueryDTO[] {
	if (isEmptyQuery(query)) {
		return [];
	}

	const { queryPayload } = prepareQueryRangePayloadV5({
		query,
		graphType,
		selectedTime: 'GLOBAL_TIME',
	});
	const envelopes = queryPayload.compositeQuery.queries ?? [];
	if (envelopes.length === 0) {
		return [];
	}

	const outerKind = deriveOuterKind(graphType);

	switch (query.queryType) {
		case EQueryType.QUERY_BUILDER:
			assertFormulaAndTraceOperatorReferenceBuilder(query);
			return [buildQueryBuilderEnvelope(envelopes, outerKind)];
		case EQueryType.PROM:
			return [buildBareOrComposite(envelopes, outerKind, 'signoz/PromQLQuery')];
		case EQueryType.CLICKHOUSE:
			return [buildBareOrComposite(envelopes, outerKind, 'signoz/ClickHouseSQL')];
		default:
			return [];
	}
}

// Semantic invariant: formulas (`A + 1`) and trace operators (`A && B`)
// reference builder queries by name. They are only meaningful when at least
// one builder query is present in the same panel. Throw on save-time
// violation so corrupt state can't be persisted; reads are handled defensively
// in fromPerses.
function assertFormulaAndTraceOperatorReferenceBuilder(query: Query): void {
	const builderCount = query.builder?.queryData?.length ?? 0;
	const formulaCount = query.builder?.queryFormulas?.length ?? 0;
	const traceOperatorCount = query.builder?.queryTraceOperator?.length ?? 0;
	if (builderCount > 0) {
		return;
	}
	if (formulaCount === 0 && traceOperatorCount === 0) {
		return;
	}
	throw new Error(
		'toPerses: cannot serialize a query with ' +
			`${formulaCount} formula(s) and ${traceOperatorCount} trace operator(s) ` +
			'but no builder queries. Formulas and trace operators reference ' +
			'builder queries by name and cannot exist alone.',
	);
}

// QUERY_BUILDER dispatch: a single envelope of a recognized type collapses to
// its bare wrapper; anything else (multi-envelope, mixed types) becomes a
// CompositeQuery containing all envelopes.
function buildQueryBuilderEnvelope(
	envelopes: QueryEnvelope[],
	outerKind: Querybuildertypesv5RequestTypeDTO,
): DashboardtypesQueryDTO {
	if (envelopes.length === 1) {
		const bareKind = QUERY_BUILDER_BARE_KIND[envelopes[0].type];
		if (bareKind) {
			return wrapBare(outerKind, bareKind, envelopes[0]);
		}
	}
	return wrapComposite(outerKind, envelopes);
}

// PROM / CLICKHOUSE dispatch: single envelope → bare; multi → composite.
function buildBareOrComposite(
	envelopes: QueryEnvelope[],
	outerKind: Querybuildertypesv5RequestTypeDTO,
	bareKind: BarePluginKind,
): DashboardtypesQueryDTO {
	return envelopes.length === 1
		? wrapBare(outerKind, bareKind, envelopes[0])
		: wrapComposite(outerKind, envelopes);
}

function isEmptyQuery(query: Query): boolean {
	const hasBuilder =
		(query.builder?.queryData?.length ?? 0) > 0 ||
		(query.builder?.queryFormulas?.length ?? 0) > 0 ||
		(query.builder?.queryTraceOperator?.length ?? 0) > 0;
	const hasPromql = (query.promql?.length ?? 0) > 0;
	const hasClickhouse = (query.clickhouse_sql?.length ?? 0) > 0;
	return !hasBuilder && !hasPromql && !hasClickhouse;
}
