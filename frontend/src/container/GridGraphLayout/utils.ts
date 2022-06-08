import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { Layout } from 'react-grid-layout';
import store from 'store';
import { Dashboard } from 'types/api/dashboard/getAll';

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
			widgets: [
				...(data.widgets || []),
				{
					description: '',
					id: generateWidgetId,
					isStacked: false,
					nullZeroValues: '',
					opacity: '',
					panelTypes: graphType,
					query: [
						{
							query: '',
							legend: '',
						},
					],
					queryData: {
						data: [],
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
