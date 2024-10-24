import { Format } from 'container/NewWidget/RightContainer/types';
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
	legend: string;
	limit?: number | null;
	having?: Having[];
	stepInterval?: number;
	orderBy?: OrderByPayload[];
}

export interface TagFilterItem {
	id: string;
	key?: BaseAutocompleteData;
	op: string;
	value: string[] | string | number | boolean;
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

export interface QueryFunctionProps {
	name: string;
	args: (string | number)[];
	namedArgs?: Record<string, any>;
}

// Type for query builder
export type IBuilderQuery = {
	queryName: string;
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: BaseAutocompleteData;
	timeAggregation: string;
	spaceAggregation?: string;
	temporality?: string;
	functions: QueryFunctionProps[];
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
	selectColumns?: BaseAutocompleteData[];
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
	unit?: Format['id'];
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
