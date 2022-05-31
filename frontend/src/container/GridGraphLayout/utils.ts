import { notification } from 'antd';
import updateDashboardApi from 'api/dashboard/update';
import {
	ClickHouseQueryTemplate,
	PromQLQueryTemplate,
	QueryBuilderQueryTemplate,
} from 'constants/dashboard';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import history from 'lib/history';
import GetQueryName from 'lib/query/GetQueryName';
import { Layout } from 'react-grid-layout';
import { Dashboard } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

export const updateDashboard = async ({
	data,
	graphType,
	generateWidgetId,
	layout,
	selectedDashboard,
}: UpdateDashboardProps): Promise<void> => {
	const response = await updateDashboardApi({
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
					queryType: 0,

					query: {
						queryType: EQueryType.QUERY_BUILDER,
						promQL: [
							{
								name: GetQueryName([]),
								...PromQLQueryTemplate,
							},
						],
						clickHouse: [
							{
								name: GetQueryName([]),
								...ClickHouseQueryTemplate,
							},
						],
						metricsBuilder: {
							formulas: [],
							queryBuilder: [
								{
									name: GetQueryName([]),
									...QueryBuilderQueryTemplate,
								},
							],
						},
					},
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
	});

	if (response.statusCode === 200) {
		history.push(
			`${history.location.pathname}/new?graphType=${graphType}&widgetId=${generateWidgetId}`,
		);
	} else {
		notification.error({
			message: response.error || 'Something went wrong',
		});
	}
};

interface UpdateDashboardProps {
	data: Dashboard['data'];
	graphType: GRAPH_TYPES;
	generateWidgetId: string;
	layout: Layout[];
	selectedDashboard: Dashboard;
}
