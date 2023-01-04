import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
} from 'types/api/dashboard/getAll';

export interface IQueryBuilderQueryHandleChange {
	queryIndex: number | string;
	aggregateFunction?: IMetricsBuilderQuery['aggregateOperator'];
	metricName?: IMetricsBuilderQuery['metricName'];
	tagFilters?: IMetricsBuilderQuery['tagFilters']['items'];
	groupBy?: IMetricsBuilderQuery['groupBy'];
	legend?: IMetricsBuilderQuery['legend'];
	toggleDisable?: boolean;
	toggleDelete?: boolean;
	reduceTo?: IMetricsBuilderQuery['reduceTo'];
}

export interface IQueryBuilderFormulaHandleChange {
	formulaIndex: number | string;
	expression?: IMetricsBuilderFormula['expression'];
	toggleDisable?: IMetricsBuilderFormula['disabled'];
	legend?: IMetricsBuilderFormula['legend'];
	toggleDelete?: boolean;
}
