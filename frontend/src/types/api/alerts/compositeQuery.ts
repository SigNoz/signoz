import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
	IPromQLQuery,
	IQueryBuilderTagFilters,
} from 'types/api/dashboard/getAll';
import { EAggregateOperator, EQueryType } from 'types/common/dashboard';

export interface ICompositeMetricQuery {
	builderQueries: IBuilderQueries;
	promQueries: IPromQueries;
	queryType: EQueryType;
}

export interface IPromQueries {
	[key: string]: IPromQuery;
}

export interface IPromQuery extends IPromQLQuery {
	stats?: '';
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
		>,
		Omit<IFormulaQuery, 'expression'> {
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
