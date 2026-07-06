import type {
	DashboardtypesBuilderQuerySpecDTO,
	DashboardtypesQueryDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5QueryEnvelopeDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryPluginKind,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind as CompositeQueryPluginKind,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
	Querybuildertypesv5QueryEnvelopePromQLDTOType,
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
 * Adapters between the V2 perses query shape and the V1 `Query` the shared query
 * builder uses. Both directions pivot through the V5 query-envelope list to reuse
 * the existing V1↔V5 mappers.
 *
 * Two nominally-distinct envelope families meet here: the generated
 * `Querybuildertypesv5QueryEnvelopeDTO` (enum `type`, undiscriminated `spec`) carried
 * by the panel spec + request builder, and the hand-written `QueryEnvelope` (typed
 * `spec`) the V1 mappers consume. They describe the same wire shape, so converting
 * between them is a structural cast — localized to the two `*Envelopes` helpers below.
 */

const toMapperEnvelopes = (
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
): QueryEnvelope[] => envelopes as unknown as QueryEnvelope[];

const toGeneratedEnvelopes = (
	envelopes: QueryEnvelope[],
): Querybuildertypesv5QueryEnvelopeDTO[] =>
	envelopes as unknown as Querybuildertypesv5QueryEnvelopeDTO[];

const isBuilderQueryEnvelope = (
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): boolean =>
	envelope.type === Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query;

/**
 * Clears the V1 explorer's `pageSize`/`offset` before conversion — the shared mapper folds
 * `pageSize` into the V5 `limit`, which usePanelQuery would read as a user cap and hide the
 * pager. Dropped here, `limit` reflects only a real user limit and List panels page by default.
 */
const withoutExplorerPaging = (query: Query): Query => ({
	...query,
	builder: {
		...query.builder,
		queryData: query.builder.queryData.map((data) => ({
			...data,
			pageSize: undefined,
			offset: undefined,
		})),
	},
});

export function deriveQueryType(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
): EQueryType {
	if (
		envelopes.some(
			(e) => e.type === Querybuildertypesv5QueryEnvelopePromQLDTOType.promql,
		)
	) {
		return EQueryType.PROM;
	}
	if (
		envelopes.some(
			(e) =>
				e.type ===
				Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql,
		)
	) {
		return EQueryType.CLICKHOUSE;
	}
	return EQueryType.QUERY_BUILDER;
}

/**
 * V5 query-envelope list → V1 `Query`, via `mapQueryDataFromApi`. An empty list opens
 * on a fresh metrics builder query. Used by `fromPerses` and by the envelopes a
 * `/substitute_vars` round-trip returns with dashboard variables resolved.
 */
export function envelopesToQuery(
	envelopes: Querybuildertypesv5QueryEnvelopeDTO[],
	panelType: PANEL_TYPES,
): Query {
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
		queries: toMapperEnvelopes(envelopes),
	};

	return mapQueryDataFromApi(composite);
}

/**
 * Perses panel queries → V1 `Query` (to seed the query builder), via the V5 envelope
 * list + `mapQueryDataFromApi`. An empty panel opens on a fresh metrics builder query.
 */
export function fromPerses(
	queries: DashboardtypesQueryDTO[],
	panelType: PANEL_TYPES,
): Query {
	return envelopesToQuery(toQueryEnvelopes(queries), panelType);
}

/**
 * V1 `Query` → perses panel queries (to write the builder result back to the editor
 * draft). Wrapped in a single `signoz/CompositeQuery` to satisfy the
 * `panel.queries.length === 1` invariant. Exception: List emits its one builder query
 * as a bare `signoz/BuilderQuery` because the backend rejects a `signoz/CompositeQuery`.
 */
export function toPerses(
	query: Query,
	panelType: PANEL_TYPES,
): DashboardtypesQueryDTO[] {
	// List panels page server-side via usePanelQuery, so drop the V1 explorer's paging
	// fields before conversion — otherwise the shared mapper folds them into `limit`.
	const source =
		panelType === PANEL_TYPES.LIST ? withoutExplorerPaging(query) : query;
	const composite = mapCompositeQueryFromQuery(source, panelType);
	const envelopes = toGeneratedEnvelopes(composite.queries ?? []);

	if (panelType === PANEL_TYPES.LIST) {
		const builder = envelopes.find(isBuilderQueryEnvelope);
		if (!builder) {
			return [];
		}
		return [
			{
				kind: panelTypeToRequestType(panelType),
				spec: {
					plugin: {
						kind: BuilderQueryPluginKind['signoz/BuilderQuery'],
						// The generated envelope union doesn't discriminate `spec` by `type`, so
						// narrow the filtered builder query to the dashboard builder spec.
						spec: builder.spec as DashboardtypesBuilderQuerySpecDTO,
					},
				},
			},
		];
	}

	const compositeSpec: Querybuildertypesv5CompositeQueryDTO = {
		queries: envelopes,
	};
	return [
		{
			kind: panelTypeToRequestType(panelType),
			spec: {
				plugin: {
					kind: CompositeQueryPluginKind['signoz/CompositeQuery'],
					spec: compositeSpec,
				},
			},
		},
	];
}
