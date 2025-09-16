/* eslint-disable sonarjs/cognitive-complexity */
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { placeWidgetAtBottom } from 'container/NewWidget/utils';
import { isArray } from 'lodash-es';
import {
	Dashboard,
	IDashboardVariable,
	Widgets,
} from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuidv4 } from 'uuid';

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
		id: `${key}--${dataType || DataTypes.String}--${type || ''}`,
	},
	op: op || '=',
	value: value.toString(),
});

export const createDynamicVariableToWidgetsMap = (
	dynamicVariables: IDashboardVariable[],
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
			if (
				widget.query?.builder?.queryData &&
				widget.query?.queryType === EQueryType.QUERY_BUILDER
			) {
				widget.query.builder.queryData.forEach((queryData: IBuilderQuery) => {
					// Check filter items for dynamic variables
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

					// Check filter expression for dynamic variables
					if (queryData.filter?.expression) {
						dynamicVariables.forEach((variable) => {
							if (
								variable.dynamicVariablesAttribute &&
								queryData.filter?.expression?.includes(`$${variable.name}`) &&
								!dynamicVariableToWidgetsMap[variable.id].includes(widget.id)
							) {
								dynamicVariableToWidgetsMap[variable.id].push(widget.id);
							}
						});
					}
				});
			}
		});
	}

	return dynamicVariableToWidgetsMap;
};

export const getWidgetsHavingDynamicVariableAttribute = (
	dynamicVariablesAttribute: string,
	widgets: Widgets[],
	variableName?: string,
): string[] => {
	const widgetsHavingDynamicVariableAttribute: string[] = [];

	if (Array.isArray(widgets)) {
		widgets.forEach((widget) => {
			if (
				widget.query?.builder?.queryData &&
				widget.query?.queryType === EQueryType.QUERY_BUILDER
			) {
				widget.query.builder.queryData.forEach((queryData: IBuilderQuery) => {
					// Check filter items for dynamic variables
					queryData.filters?.items?.forEach((filter: TagFilterItem) => {
						if (
							dynamicVariablesAttribute &&
							filter.key?.key === dynamicVariablesAttribute &&
							// If variableName is provided, validate that the filter value actually contains the variable reference
							(!variableName ||
								(isArray(filter.value) && filter.value.includes(`$${variableName}`)) ||
								filter.value === `$${variableName}`) &&
							!widgetsHavingDynamicVariableAttribute.includes(widget.id)
						) {
							widgetsHavingDynamicVariableAttribute.push(widget.id);
						}
					});

					// Check filter expression for dynamic variables
					if (
						queryData.filter?.expression &&
						dynamicVariablesAttribute &&
						queryData.filter.expression.includes(
							variableName ? `$${variableName}` : `$${dynamicVariablesAttribute}`,
						) &&
						!widgetsHavingDynamicVariableAttribute.includes(widget.id)
					) {
						widgetsHavingDynamicVariableAttribute.push(widget.id);
					}
				});
			}
		});
	}

	return widgetsHavingDynamicVariableAttribute;
};
