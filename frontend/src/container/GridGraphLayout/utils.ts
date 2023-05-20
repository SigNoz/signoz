import { NotificationInstance } from 'antd/es/notification/interface';
import updateDashboardApi from 'api/dashboard/update';
import {
	ClickHouseQueryTemplate,
	PromQLQueryTemplate,
} from 'constants/dashboard';
import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import GetQueryName from 'lib/query/GetQueryName';
import { Layout } from 'react-grid-layout';
import store from 'store';
import { Dashboard } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

export const UpdateDashboard = async (
	{
		data,
		graphType,
		generateWidgetId,
		layout,
		selectedDashboard,
		isRedirected,
	}: UpdateDashboardProps,
	notify: NotificationInstance,
): Promise<Dashboard | undefined> => {
	const updatedSelectedDashboard: Dashboard = {
		...selectedDashboard,
		data: {
			title: data.title,
			description: data.description,
			name: data.name,
			tags: data.tags,
			variables: data.variables,
			widgets: [
				...(data.widgets || []),
				{
					description: '',
					id: generateWidgetId,
					isStacked: false,
					nullZeroValues: '',
					opacity: '',
					panelTypes: graphType,
					query: {
						queryType: EQueryType.QUERY_BUILDER,
						promql: [
							{
								name: GetQueryName([]) || '',
								...PromQLQueryTemplate,
							},
						],
						clickhouse_sql: [
							{
								name: GetQueryName([]) || '',
								...ClickHouseQueryTemplate,
							},
						],
						builder: {
							queryFormulas: [],
							queryData: [initialQueryBuilderFormValues],
						},
					},
					queryData: {
						data: { queryData: [] },
						error: false,
						errorMessage: '',
						loading: false,
					},
					timePreferance: 'GLOBAL_TIME',
					title: '',
				},
			],
			layout,
		},
		uuid: selectedDashboard.uuid,
	};

	const response = await updateDashboardApi(updatedSelectedDashboard);

	if (response.payload) {
		store.dispatch({
			type: 'UPDATE_DASHBOARD',
			payload: response.payload,
		});
	}

	if (isRedirected) {
		if (response.statusCode === 200) {
			return response.payload;
		}
		notify.error({
			message: response.error || 'Something went wrong',
		});
		return undefined;
	}
	return undefined;
};

interface UpdateDashboardProps {
	data: Dashboard['data'];
	graphType: GRAPH_TYPES;
	generateWidgetId: string;
	layout: Layout[];
	selectedDashboard: Dashboard;
	isRedirected: boolean;
}
