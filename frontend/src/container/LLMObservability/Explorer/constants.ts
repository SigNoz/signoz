import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

// View switcher for the AI Observability explorer. Trace is the landing view
// (§6.2C), so it is listed first; Clickhouse is not offered here at all.
export const AI_EXPLORER_TOOLBAR_VIEWS = {
	trace: {
		name: 'trace',
		label: 'Trace',
		disabled: false,
		show: true,
		key: 'trace',
	},
	list: {
		name: 'list',
		label: 'Span List',
		disabled: false,
		show: true,
		key: 'list',
	},
	timeseries: {
		name: 'timeseries',
		label: 'Timeseries',
		disabled: false,
		show: true,
		key: 'timeseries',
	},
	table: {
		name: 'table',
		label: 'Table',
		disabled: false,
		show: true,
		key: 'table',
	},
};

/**
 * Fallback quick filters, used until the backend serves custom filters for the
 * `ai_observability` signal. `getFilterConfig` returns this list verbatim while
 * `GET /orgs/me/filters/ai_observability` comes back empty.
 */
export const AI_OBSERVABILITY_QUICK_FILTERS_CONFIG: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		attributeKey: {
			key: 'service.name',
			dataType: DataTypes.String,
			type: 'resource',
			id: 'service.name--string--resource--true',
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Model',
		attributeKey: {
			key: 'gen_ai.request.model',
			dataType: DataTypes.String,
			type: 'tag',
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Provider',
		attributeKey: {
			key: 'gen_ai.system',
			dataType: DataTypes.String,
			type: 'tag',
		},
		dataSource: DataSource.TRACES,
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Operation',
		attributeKey: {
			key: 'gen_ai.operation.name',
			dataType: DataTypes.String,
			type: 'tag',
		},
		dataSource: DataSource.TRACES,
		defaultOpen: false,
	},
];
