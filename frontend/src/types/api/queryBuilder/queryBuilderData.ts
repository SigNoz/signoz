import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	QueryBuilderData,
	ReduceOperators,
} from 'types/common/queryBuilder';

import { BaseAutocompleteData } from './queryAutocompleteResponse';

// Type for Formula
export interface IBuilderFormula {
	expression: string;
	disabled: boolean;
	queryName: string;
	dataSource?: DataSource;
	legend: string;
}

export interface TagFilterItem {
	id: string;
	key?: BaseAutocompleteData;
	op: string;
	value: string[] | string;
}

export interface TagFilter {
	items: TagFilterItem[];
	op: string;
}

export type Having = {
	columnName: string;
	op: string;
	value: number | number[];
};

export type HavingForm = Omit<Having, 'value'> & {
	value: string[];
};

export type OrderByPayload = {
	columnName: string;
	order: string;
};

// Type for query builder
export type IBuilderQuery = {
	queryName: string;
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: BaseAutocompleteData;
	filters: TagFilter;
	groupBy: BaseAutocompleteData[];
	expression: string;
	disabled: boolean;
	having: Having[];
	limit: number | null;
	stepInterval: number;
	orderBy: OrderByPayload[];
	reduceTo: ReduceOperators;
	legend: string;
	pageSize?: number;
	offset?: number;
};

export interface IClickHouseQuery {
	name: string;
	legend: string;
	disabled: boolean;
	query: string;
}
export interface IPromQLQuery {
	query: string;
	legend: string;
	disabled: boolean;
	name: string;
}

export interface Query {
	queryType: EQueryType;
	promql: IPromQLQuery[];
	builder: QueryBuilderData;
	clickhouse_sql: IClickHouseQuery[];
	id: string;
}

export type QueryState = Omit<Query, 'queryType'>;

export type BuilderClickHouseResource = Record<string, IClickHouseQuery>;
export type BuilderPromQLResource = Record<string, IPromQLQuery>;
export type BuilderQueryDataResourse = Record<
	string,
	IBuilderQuery | IBuilderFormula
>;

export type MapData =
	| IBuilderQuery
	| IBuilderFormula
	| IClickHouseQuery
	| IPromQLQuery;

export type MapQueryDataToApiResult<T> = {
	data: T;
	newLegendMap: Record<string, string>;
};
