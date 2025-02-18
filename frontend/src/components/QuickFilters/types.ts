import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export enum FiltersType {
	SLIDER = 'SLIDER',
	CHECKBOX = 'CHECKBOX',
}

export enum MinMax {
	MIN = 'MIN',
	MAX = 'MAX',
}

export enum SpecficFilterOperations {
	ALL = 'ALL',
	ONLY = 'ONLY',
}

export interface IQuickFiltersConfig {
	type: FiltersType;
	title: string;
	attributeKey: BaseAutocompleteData;
	aggregateOperator?: string;
	aggregateAttribute?: string;
	dataSource?: DataSource;
	customRendererForValue?: (value: string) => JSX.Element;
	defaultOpen: boolean;
}

export interface IQuickFiltersProps {
	config: IQuickFiltersConfig[];
	handleFilterVisibilityChange: () => void;
	source: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
}

export enum QuickFiltersSource {
	LOGS_EXPLORER = 'logs-explorer',
	INFRA_MONITORING = 'infra-monitoring',
	TRACES_EXPLORER = 'traces-explorer',
}
