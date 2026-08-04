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
	// POC: AI Observability explorer — maps to GET /orgs/me/filters/ai_observability
	AI_OBSERVABILITY = 'ai_observability',
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
	dataSource?: DataSource;
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
	handleFilterVisibilityChange: () => void;
	source: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
	onQuickFilterChange?: (data: QuickFilterChangeEventData) => void;
	signal?: SignalType;
	className?: string;
	showFilterCollapse?: boolean;
	showQueryName?: boolean;
	useFieldApis?: QuickFilterCheckboxUseFieldApis;
}

export enum QuickFiltersSource {
	LOGS_EXPLORER = 'logs-explorer',
	INFRA_MONITORING = 'infra-monitoring',
	TRACES_EXPLORER = 'traces-explorer',
	API_MONITORING = 'api-monitoring',
	EXCEPTIONS = 'exceptions',
	METER_EXPLORER = 'meter',
	// POC: AI Observability explorer surface
	AI_OBSERVABILITY = 'ai-observability',
}

/**
 * Opt-in: fetch values from the /v1/fields/values API instead of /v3/autocomplete/attribute_values
 */
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
