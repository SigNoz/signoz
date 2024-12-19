import { PANEL_TYPES } from 'constants/queryBuilder';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { Dashboard } from 'types/api/dashboard/getAll';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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
	selectedColumns?: BaseAutocompleteData[] | null,
): Dashboard => {
	const logsSelectedColumns = [
		baseLogsSelectedColumns,
		...convertKeysToColumnFields(selectedColumns || []),
	];

	return {
		...dashboard,
		data: {
			...dashboard.data,
			layout: [
				{
					i: widgetId,
					w: 6,
					x: 0,
					h: 6,
					y: 0,
				},
				...(dashboard?.data?.layout || []),
			],
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
