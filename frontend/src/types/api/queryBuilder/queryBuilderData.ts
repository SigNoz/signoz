import { DataSource } from 'types/common/queryBuilder';

import { BaseAutocompleteData } from './queryAutocompleteResponse';

// Type for Formula
export interface IBuilderFormula {
	expression: string;
	disabled: boolean;
	label: string;
	legend: string;
}

export interface TagFilterItem {
	key: string;
	// TODO: type it in the future
	op: string;
	value: string[];
}

export interface TagFilter {
	items: TagFilterItem[];
	// TODO: type it in the future
	op: string;
}

// Type for query builder
export type IBuilderQuery = {
	queryName: string;
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: string;
	tagFilters: TagFilter[];
	groupBy: BaseAutocompleteData[];
	expression: string;
	disabled: boolean;
	having?: string;
	limit?: number;
	orderBy?: string[];
	reduceTo?: string;
};

export type IBuilderQueryForm = Omit<IBuilderQuery, 'aggregateAttribute'> & {
	aggregateAttribute: BaseAutocompleteData;
};
