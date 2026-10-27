import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import { cloneDeep, isEqual, isPlainObject } from 'lodash-es';
import {
	Querybuildertypesv5QueryTypeDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v5 as uuidv5 } from 'uuid';

import {
	ExplorerQueryRules,
	getExplorerQueryRules,
} from './explorerQueryRules';

const COMPOSITE_QUERY_ID_NAMESPACE = '2f1c6a4e-9b3d-4c57-8e21-7a0d5f6b9c13';

export type NormalizedQuery = {
	query: Query;
	/** The url query had to be repaired, so the url should be rewritten. */
	changed: boolean;
};

/**
 * Repairs a `compositeQuery` read from the url so the query builder can load it.
 * Links built by agents can leave out whole blocks, or carry a query the
 * current explorer cannot run.
 */
export function normalizeCompositeQuery(
	urlQuery: object,
	pathname: string,
): NormalizedQuery {
	const query = cloneDeep(urlQuery) as Query;

	addMissingBlocks(query, urlQuery);

	const rules = getExplorerQueryRules(pathname);
	if (rules) {
		fitQueryToExplorer(query, rules);
	}

	return { query, changed: !isEqual(query, urlQuery) };
}

function addMissingBlocks(query: Query, urlQuery: object): void {
	if (!query.id) {
		query.id = getStableId(urlQuery);
	}

	if (!Object.values(EQueryType).includes(query.queryType)) {
		query.queryType = EQueryType.QUERY_BUILDER;
	}

	if (!isListOfObjects(query.promql)) {
		query.promql = cloneDeep(initialQueryState.promql);
	}

	if (!isListOfObjects(query.clickhouse_sql)) {
		query.clickhouse_sql = cloneDeep(initialQueryState.clickhouse_sql);
	}

	if (!isPlainObject(query.builder)) {
		query.builder = cloneDeep(initialQueryState.builder);
	}

	const { queryData } = query.builder;
	if (!isListOfObjects(queryData) || queryData.length === 0) {
		query.builder.queryData = cloneDeep(initialQueryState.builder.queryData);
	}

	if (!query.builder.queryFormulas) {
		query.builder.queryFormulas = [];
	}

	if (!query.builder.queryTraceOperator) {
		query.builder.queryTraceOperator = [];
	}
}

/**
 * The provider matches the staged query to the url query by id, so a link
 * without an id must get the same one on every read.
 */
function getStableId(urlQuery: object): string {
	return uuidv5(JSON.stringify(urlQuery), COMPOSITE_QUERY_ID_NAMESPACE);
}

function isListOfObjects(value: unknown): boolean {
	return Array.isArray(value) && value.every((item) => isPlainObject(item));
}

function fitQueryToExplorer(query: Query, rules: ExplorerQueryRules): void {
	// Explorers only have the query builder: no PromQL or ClickHouse editor.
	query.queryType = EQueryType.QUERY_BUILDER;

	if (query.promql.some((promql) => promql.query !== '')) {
		query.promql = cloneDeep(initialQueryState.promql);
	}

	if (query.clickhouse_sql.some((clickhouse) => clickhouse.query !== '')) {
		query.clickhouse_sql = cloneDeep(initialQueryState.clickhouse_sql);
	}

	if (!rules.allowsTraceOperator) {
		query.builder.queryTraceOperator = [];
	}

	query.builder.queryData = query.builder.queryData.map((builderQuery) =>
		fitBuilderQueryToExplorer(builderQuery, rules),
	);
}

function fitBuilderQueryToExplorer(
	builderQuery: IBuilderQuery,
	rules: ExplorerQueryRules,
): IBuilderQuery {
	fillMissingSignal(builderQuery, rules);

	if (belongsToExplorer(builderQuery, rules)) {
		return builderQuery;
	}

	const replacement = getDefaultBuilderQuery(rules);
	// Keep the name, so formulas that reference this query still resolve.
	replacement.queryName = builderQuery.queryName ?? replacement.queryName;
	replacement.expression = builderQuery.expression ?? replacement.expression;

	return replacement;
}

/** A link may leave out the fields that pick the signal: read them as the explorer's. */
function fillMissingSignal(
	builderQuery: IBuilderQuery,
	rules: ExplorerQueryRules,
): void {
	if (builderQuery.dataSource === undefined) {
		builderQuery.dataSource = rules.dataSource;
	}

	// A missing `source` already means '', so only meter needs it written.
	if (
		builderQuery.source === undefined &&
		rules.source === TelemetrytypesSourceDTO.meter
	) {
		builderQuery.source = rules.source;
	}

	// A missing `builderQueryType` already means builder_query, so only AI needs it written.
	if (
		builderQuery.builderQueryType === undefined &&
		rules.builderQueryType === Querybuildertypesv5QueryTypeDTO.builder_ai_query
	) {
		builderQuery.builderQueryType = rules.builderQueryType;
	}
}

function belongsToExplorer(
	builderQuery: IBuilderQuery,
	rules: ExplorerQueryRules,
): boolean {
	if (builderQuery.dataSource !== rules.dataSource) {
		return false;
	}

	if ((builderQuery.source ?? '') !== rules.source) {
		return false;
	}

	const builderQueryType =
		builderQuery.builderQueryType ??
		Querybuildertypesv5QueryTypeDTO.builder_query;

	if (builderQueryType !== rules.builderQueryType) {
		return false;
	}

	return true;
}

function getDefaultBuilderQuery(rules: ExplorerQueryRules): IBuilderQuery {
	const builderQuery = cloneDeep(
		initialQueryBuilderFormValuesMap[rules.dataSource],
	);
	builderQuery.source = rules.source;

	if (
		rules.builderQueryType === Querybuildertypesv5QueryTypeDTO.builder_ai_query
	) {
		builderQuery.builderQueryType = rules.builderQueryType;
	}

	return builderQuery;
}
