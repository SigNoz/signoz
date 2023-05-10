import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import {
	IClickHouseQuery,
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IPromQLQuery,
	IQueryBuilderTagFilters,
} from 'types/api/dashboard/getAll';
import { EAggregateOperator, EQueryType } from 'types/common/dashboard';
import { QueryDataResourse } from 'types/common/queryBuilderMappers.types';

export interface ICompositeMetricQuery {
	builderQueries: QueryDataResourse;
	promQueries: IPromQueries;
	chQueries: IChQueries;
	queryType: EQueryType;
	panelType: GRAPH_TYPES;
}

export interface IChQueries {
	[key: string]: IChQuery;
}

export interface IChQuery extends IClickHouseQuery {
	query: string;
}

export interface IPromQuery extends IPromQLQuery {
	stats?: '';
}

export interface IPromQueries {
	[key: string]: IPromQuery;
}
export interface IBuilderQueries {
	[key: string]: IBuilderQuery;
}

// IBuilderQuery combines IMetricQuery and IFormulaQuery
// for api calls
export interface IBuilderQuery
	extends Omit<
		IMetricQuery,
		'aggregateOperator' | 'legend' | 'metricName' | 'tagFilters'
	> {
	aggregateOperator: EAggregateOperator | undefined;
	disabled: boolean;
	name: string;
	legend?: string;
	metricName: string | null;
	groupBy?: string[];
	expression?: string;
	tagFilters?: IQueryBuilderTagFilters;
	toggleDisable?: boolean;
	toggleDelete?: boolean;
}

export interface IFormulaQueries {
	[key: string]: IFormulaQuery;
}

export interface IFormulaQuery extends IMetricsBuilderFormula {
	formulaOnly: boolean;
	queryName: string;
}

export interface IMetricQueries {
	[key: string]: IMetricQuery;
}

export interface IMetricQuery extends IMetricsBuilderQuery {
	formulaOnly: boolean;
	expression?: string;
	queryName: string;
}
