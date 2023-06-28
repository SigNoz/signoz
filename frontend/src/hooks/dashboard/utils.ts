import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const addEmptyWidgetInDashboardJSONWithQuery = (
	dashboard: Dashboard,
	query: Query,
): Dashboard => ({
	...dashboard,
	data: {
		...dashboard.data,
		layout: [
			{
				i: 'empty',
				w: 6,
				x: 0,
				h: 2,
				y: 0,
			},
			...(dashboard?.data?.layout || []),
		],
		widgets: [
			...(dashboard?.data?.widgets || []),
			{
				id: 'empty',
				query,
				description: '',
				isStacked: false,
				nullZeroValues: '',
				opacity: '',
				title: '',
				timePreferance: 'GLOBAL_TIME',
				panelTypes: PANEL_TYPES.TIME_SERIES,
			},
		],
	},
});
