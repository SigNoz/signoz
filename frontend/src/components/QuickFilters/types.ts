import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export enum FiltersType {
	SLIDER = 'SLIDER',
	CHECKBOX = 'CHECKBOX',
	DURATION = 'DURATION', // ALIAS FOR DURATION_NANO
}

export enum MinMax {
	MIN = 'MIN',
	MAX = 'MAX',
}

export enum SpecficFilterOperations {
	ALL = 'ALL',
	ONLY = 'ONLY',
}

export enum SignalType {
	TRACES = 'traces',
	LOGS = 'logs',
	API_MONITORING = 'api_monitoring',
	EXCEPTIONS = 'exceptions',
	METER_EXPLORER = 'meter',
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
	signal?: SignalType;
	className?: string;
	showFilterCollapse?: boolean;
	showQueryName?: boolean;
}

export enum QuickFiltersSource {
	LOGS_EXPLORER = 'logs-explorer',
	INFRA_MONITORING = 'infra-monitoring',
	TRACES_EXPLORER = 'traces-explorer',
	API_MONITORING = 'api-monitoring',
	EXCEPTIONS = 'exceptions',
	METER_EXPLORER = 'meter',
}
