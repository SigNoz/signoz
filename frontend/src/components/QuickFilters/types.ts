import { ReactNode } from 'react';
import { QuickfiltertypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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

/**
 * Missing export from signozhq/ui/checkbox, TODO(H4ad): Add and remove this type definition
 */
export type CheckedState = 'checked' | 'unchecked' | 'indeterminate';

export interface IQuickFiltersConfig {
	type: FiltersType;
	title: string;
	attributeKey: BaseAutocompleteData;
	aggregateOperator?: string;
	aggregateAttribute?: string;
	customRendererForValue?: (value: string) => JSX.Element;
	defaultOpen: boolean;
}

export interface QuickFilterChangeEventData {
	filterKey: string;
	expression: string;
	filterItemKeys: string[];
}

export interface IQuickFiltersProps {
	config: IQuickFiltersConfig[];
	handleFilterVisibilityChange?: () => void;
	quickFilterSource: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
	onQuickFilterChange?: (data: QuickFilterChangeEventData) => void;
	className?: string;
	showFilterCollapse?: boolean;
	showQueryName?: boolean;
	useFieldApis: QuickFilterCheckboxUseFieldApis;
	savedViewsHeader?: ReactNode;
}

export const QuickFiltersSource = {
	LOGS_EXPLORER: QuickfiltertypesSourceDTO.logs,
	TRACES_EXPLORER: QuickfiltertypesSourceDTO.traces,
	EXCEPTIONS: QuickfiltertypesSourceDTO.exceptions,
	API_MONITORING: QuickfiltertypesSourceDTO.api_monitoring,
	METER_EXPLORER: QuickfiltertypesSourceDTO.meter,
	AI_OBSERVABILITY: QuickfiltertypesSourceDTO.ai_observability,
	/** No saved filter list: renders `config` as given. */
	INFRA_MONITORING: 'infra-monitoring',
} as const;

export type QuickFiltersSource =
	(typeof QuickFiltersSource)[keyof typeof QuickFiltersSource];

export type QuickFilterCheckboxUseFieldApis = {
	startUnixMilli: number;
	endUnixMilli: number;
	/**
	 * If you didn't specify a string, we automatically try to extract this from the currentQuery,
	 * from the filter.expression or filter.items.
	 *
	 * Use null to ignore/disable this behavior.
	 */
	existingQuery?: string | null;
	metricNamespace?: string;
};
