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
 * Adapters between the V2 perses query shape and the V1 `Query` the shared query builder uses.
 * Both directions pivot through the V5 query-envelope list so they reuse the existing V1↔V5
 * mappers. The one unavoidable cast (Orval erases envelope `spec` to `unknown`) is localized here.
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
 * Perses panel queries → V1 `Query` (to seed the query builder), via the V5 envelope list +
 * `mapQueryDataFromApi`. An empty panel opens on a fresh metrics builder query (V1 default).
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
		// Generated envelope DTO → hand-written V5 type (spec erased to unknown).
		queries: envelopes as unknown as QueryEnvelope[],
	};

	return mapQueryDataFromApi(composite);
}

/**
 * V1 `Query` → perses panel queries (to write the builder result back to the editor draft).
 * Wrapped in a single `signoz/CompositeQuery` to satisfy the `panel.queries.length === 1`
 * invariant. Exception: List emits its one builder query as a bare `signoz/BuilderQuery` because
 * the backend rejects a `signoz/CompositeQuery` for it.
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
						// Orval erases spec to `unknown`; cast to the builder query spec at this boundary.
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
