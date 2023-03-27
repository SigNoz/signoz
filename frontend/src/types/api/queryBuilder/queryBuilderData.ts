import { EAggregateOperator, EReduceOperator } from 'types/common/dashboard';

import { IQueryBuilderTagFilters } from '../dashboard/getAll';

export interface IBuilderQuery {
	// TODO: add another list of operator depended from data source
	aggregateOperator: EAggregateOperator;
	disabled: boolean;
	label: string;
	legend: string;
	attribute: string;
	groupBy: string[];
	tagFilters: IQueryBuilderTagFilters;
	reduceTo?: EReduceOperator;
}

export interface IBuilderFormula {
	expression: string;
	disabled: boolean;
	label: string;
	legend: string;
}
