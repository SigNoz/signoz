import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { placeWidgetAtBottom } from 'container/NewWidget/utils';
import { isArray } from 'lodash-es';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuidv4 } from 'uuid';

import { DynamicVariable } from './useGetDynamicVariables';

const baseLogsSelectedColumns = {
	dataType: 'string',
	type: '',
	name: 'timestamp',
};

export const addEmptyWidgetInDashboardJSONWithQuery = (
	dashboard: Dashboard,
	query: Query,
	widgetId: string,
	panelType?: PANEL_TYPES,
	selectedColumns?: TelemetryFieldKey[] | null,
): Dashboard => {
	const logsSelectedColumns = [
		baseLogsSelectedColumns,
		...convertKeysToColumnFields(selectedColumns || []),
	];

	const newLayoutItem = placeWidgetAtBottom(
		widgetId,
		dashboard?.data?.layout || [],
	);

	return {
		...dashboard,
		data: {
			...dashboard.data,
			layout: [...(dashboard?.data?.layout || []), newLayoutItem],
			widgets: [
				...(dashboard?.data?.widgets || []),
				{
					id: widgetId,
					query,
					description: '',
					isStacked: false,
					nullZeroValues: '',
					opacity: '',
					title: '',
					timePreferance: 'GLOBAL_TIME',
					panelTypes: panelType || PANEL_TYPES.TIME_SERIES,
					softMax: null,
					softMin: null,
					selectedLogFields:
						panelType === PANEL_TYPES.LIST ? logsSelectedColumns : [],
					selectedTracesFields:
						panelType === PANEL_TYPES.LIST ? selectedColumns || [] : [],
				},
			],
		},
	};
};

export const getFiltersFromKeyValue = (
	key: string,
	value: string | number,
	type?: string,
	op?: string,
	dataType?: DataTypes,
): TagFilterItem => ({
	id: uuidv4(),
	key: {
		key,
		dataType: dataType || DataTypes.String,
		type: type || '',
		isColumn: false,
		isJSON: false,
		id: `${key}--${dataType || DataTypes.String}--${type || ''}--false`,
	},
	op: op || '=',
	value: value.toString(),
});

export const createDynamicVariableToWidgetsMap = (
	dynamicVariables: DynamicVariable[],
	widgets: Widgets[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
): Record<string, string[]> => {
	const dynamicVariableToWidgetsMap: Record<string, string[]> = {};

	// Initialize map with empty arrays for each variable
	dynamicVariables.forEach((variable) => {
		if (variable.id) {
			dynamicVariableToWidgetsMap[variable.id] = [];
		}
	});

	// Check each widget for usage of dynamic variables
	if (Array.isArray(widgets)) {
		widgets.forEach((widget) => {
			if (widget.query?.builder?.queryData) {
				widget.query.builder.queryData.forEach((queryData: IBuilderQuery) => {
					queryData.filters?.items?.forEach((filter: TagFilterItem) => {
						// For each filter, check if it uses any dynamic variable
						dynamicVariables.forEach((variable) => {
							if (
								variable.dynamicVariablesAttribute &&
								filter.key?.key === variable.dynamicVariablesAttribute &&
								((isArray(filter.value) &&
									filter.value.includes(`$${variable.name}`)) ||
									filter.value === `$${variable.name}`) &&
								!dynamicVariableToWidgetsMap[variable.id].includes(widget.id)
							) {
								dynamicVariableToWidgetsMap[variable.id].push(widget.id);
							}
						});
					});
				});
			}
		});
	}

	return dynamicVariableToWidgetsMap;
};
