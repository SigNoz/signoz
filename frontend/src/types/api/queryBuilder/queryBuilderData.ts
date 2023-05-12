import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

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
	value: string[];
}

export interface TagFilter {
	items: TagFilterItem[];
	// TODO: type it in the future
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

// Type for query builder
export type IBuilderQuery = {
	queryName: string;
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: BaseAutocompleteData;
	tagFilters: TagFilter;
	groupBy: BaseAutocompleteData[];
	expression: string;
	disabled: boolean;
	having: Having[];
	limit: number | null;
	stepInterval: number;
	orderBy: BaseAutocompleteData[];
	reduceTo: ReduceOperators;
	legend: string;
};
