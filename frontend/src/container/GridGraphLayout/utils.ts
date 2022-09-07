import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import {
	ClickHouseQueryTemplate,
	PromQLQueryTemplate,
	QueryBuilderQueryTemplate,
} from 'constants/dashboard';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import GetQueryName from 'lib/query/GetQueryName';
import { Layout } from 'react-grid-layout';
import store from 'store';
import { Dashboard } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

export const UpdateDashboard = async ({
	data,
	graphType,
	generateWidgetId,
	layout,
	selectedDashboard,
	isRedirected,
}: UpdateDashboardProps): Promise<Dashboard | undefined> => {
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
						promQL: [
							{
								name: GetQueryName([]) || '',
								...PromQLQueryTemplate,
							},
						],
						clickHouse: [
							{
								name: GetQueryName([]) || '',
								...ClickHouseQueryTemplate,
							},
						],
						metricsBuilder: {
							formulas: [],
							queryBuilder: [
								{
									name: GetQueryName([]) || '',
									...QueryBuilderQueryTemplate,
								},
							],
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
		notification.error({
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
