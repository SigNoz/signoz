import type {
	DashboardtypesBuilderQuerySpecDTO,
	DashboardtypesQueryDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryPluginKind,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind as CompositeQueryPluginKind,
	Querybuildertypesv5QueryTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import type { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	panelTypeToRequestType,
	toQueryEnvelopes,
} from './buildQueryRangeRequest';

/**
 * Adapters between the V2 dashboard's perses query shape
 * (`DashboardtypesPanelDTO.spec.queries`) and the V1 `Query` the shared query
 * builder (and the global `QueryBuilderProvider`) operates on.
 *
 * Both directions pivot through the V5 query-envelope list — the same wire
 * shape `buildQueryRangeRequest`/`compositeQueryToQueryEnvelope` already produce
 * — so the conversion reuses the app's existing V1↔V5 mappers rather than
 * inventing a parallel one. The single unavoidable cast is at the
 * generated-DTO ↔ hand-written-V5-type boundary (Orval erases the envelope
 * `spec` to `unknown`); it is localized here.
 */

/** Which query-builder tab the perses queries belong to. */
function deriveQueryType(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
): EQueryType {
	if (envelopes.some((e) => e.type === Querybuildertypesv5QueryTypeDTO.promql)) {
		return EQueryType.PROM;
	}
	if (
		envelopes.some(
			(e) => e.type === Querybuildertypesv5QueryTypeDTO.clickhouse_sql,
		)
	) {
		return EQueryType.CLICKHOUSE;
	}
	return EQueryType.QUERY_BUILDER;
}

/**
 * Perses panel queries → V1 `Query` (to seed the query builder). Unwraps the
 * perses envelope to the V5 envelope list (`toQueryEnvelopes`) and runs it
 * through `mapQueryDataFromApi`, which converts every envelope type to its V1
 * shape. An empty panel opens on a fresh metrics builder query (V1 default).
 */
export function fromPerses(
	queries: DashboardtypesQueryDTO[],
	panelType: PANEL_TYPES,
): Query {
	const envelopes = toQueryEnvelopes(queries ?? []);
	if (envelopes.length === 0) {
		return initialQueriesMap[DataSource.METRICS];
	}

	const composite: ICompositeMetricQuery = {
		queryType: deriveQueryType(envelopes),
		panelType,
		builderQueries: {},
		chQueries: {},
		promQueries: {},
		unit: undefined,
		// generated envelope DTO → hand-written V5 type (spec erased to unknown).
		queries: envelopes as unknown as QueryEnvelope[],
	};

	return mapQueryDataFromApi(composite);
}

/**
 * V1 `Query` → perses panel queries (to write the builder's result back into
 * the editor draft). `mapCompositeQueryFromQuery` produces the V5 envelope list
 * (via `compositeQueryToQueryEnvelope`); we wrap it in a single
 * `signoz/CompositeQuery` perses query — the backend invariant
 * (`panel.queries.length === 1`) `toQueryEnvelopes` reads back verbatim.
 *
 * Exception: the List panel only runs the query builder (a single builder query,
 * no formulas) and the backend rejects a `signoz/CompositeQuery` for it, so its
 * one builder query is emitted as a bare `signoz/BuilderQuery` plugin instead.
 */
export function toPerses(
	query: Query,
	panelType: PANEL_TYPES,
): DashboardtypesQueryDTO[] {
	const composite = mapCompositeQueryFromQuery(query, panelType);
	const envelopes = (composite.queries ??
		[]) as unknown as Querybuildertypesv5QueryEnvelopeDTO[];

	if (panelType === PANEL_TYPES.LIST) {
		const builder = envelopes.find(
			(envelope) =>
				envelope.type === Querybuildertypesv5QueryTypeDTO.builder_query,
		);
		if (!builder) {
			return [];
		}
		return [
			{
				kind: panelTypeToRequestType(panelType),
				spec: {
					plugin: {
						kind: BuilderQueryPluginKind['signoz/BuilderQuery'],
						// Envelope spec is erased to `unknown` by Orval; it is the builder
						// query spec — cast at this generated-DTO boundary.
						spec: builder.spec as DashboardtypesBuilderQuerySpecDTO,
					},
				},
			},
		];
	}

	const spec: Querybuildertypesv5CompositeQueryDTO = { queries: envelopes };

	return [
		{
			kind: panelTypeToRequestType(panelType),
			spec: {
				plugin: {
					kind: CompositeQueryPluginKind['signoz/CompositeQuery'],
					spec,
				},
			},
		},
	];
}
