import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const addEmptyWidgetInDashboardJSONWithQuery = (
	dashboard: Dashboard,
	query: Query,
	widgetId: string,
	panelTypes?: PANEL_TYPES,
): Dashboard => ({
	...dashboard,
	data: {
		...dashboard.data,
		layout: [
			{
				i: widgetId,
				w: 6,
				x: 0,
				h: 3,
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
				panelTypes: panelTypes || PANEL_TYPES.TIME_SERIES,
				softMax: null,
				softMin: null,
			},
		],
	},
});
