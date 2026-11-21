import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import {
	initialQueriesMap,
	initialQueryAIWithType,
	type PANEL_TYPES,
} from 'constants/queryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	getQueryTypeSignals,
	type SupportedQueryTypesKindMap,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import {
	DataSource,
	type QueryBuilderContextType,
} from 'types/common/queryBuilder';

interface SeedBuilderForModeArgs {
	mode: EQueryType;
	/** The kind's first Query Builder signal; what a fresh panel of this kind starts on. */
	defaultSignal?: TelemetrytypesSignalDTO;
	panelType: PANEL_TYPES;
	updateAllQueriesOperators: QueryBuilderContextType['updateAllQueriesOperators'];
}

/** A fresh builder query for `mode`: AI is traces-only, everything else follows the kind. */
export function seedBuilderForMode({
	mode,
	defaultSignal,
	panelType,
	updateAllQueriesOperators,
}: SeedBuilderForModeArgs): Query['builder'] {
	if (mode === EQueryType.AI_QUERY_BUILDER) {
		return getActiveBuilder(
			updateAllQueriesOperators(
				initialQueryAIWithType,
				panelType,
				DataSource.TRACES,
			),
		);
	}
	const dataSource = (defaultSignal ??
		TelemetrytypesSignalDTO.metrics) as unknown as DataSource;
	return updateAllQueriesOperators(
		initialQueriesMap[dataSource],
		panelType,
		dataSource,
	).builder;
}

interface FitQueryToKindArgs {
	supportedQueryTypesKindMap: SupportedQueryTypesKindMap | undefined;
	panelType: PANEL_TYPES;
	updateAllQueriesOperators: QueryBuilderContextType['updateAllQueriesOperators'];
}

/**
 * Seeds the active builder slot when it can't be used as-is: an AI slot never opened, or
 * Query Builder queries on a signal this kind can't author (an AI panel's default).
 */
export function fitQueryToKind(
	query: Query,
	{
		supportedQueryTypesKindMap,
		panelType,
		updateAllQueriesOperators,
	}: FitQueryToKindArgs,
): Query {
	const builderSignals = getQueryTypeSignals(
		supportedQueryTypesKindMap,
		EQueryType.QUERY_BUILDER,
	);
	const seed = (): Query['builder'] =>
		seedBuilderForMode({
			mode: query.queryType,
			defaultSignal: builderSignals[0],
			panelType,
			updateAllQueriesOperators,
		});

	if (
		query.queryType === EQueryType.AI_QUERY_BUILDER &&
		!query.builder_ai_query
	) {
		return { ...query, builder_ai_query: seed() };
	}
	const authorableSignals = new Set<string>(builderSignals);
	const builderFitsKind =
		query.builder.queryData.length > 0 &&
		query.builder.queryData.every((queryData) =>
			authorableSignals.has(queryData.dataSource),
		);
	if (query.queryType === EQueryType.QUERY_BUILDER && !builderFitsKind) {
		return { ...query, builder: seed() };
	}
	return query;
}
