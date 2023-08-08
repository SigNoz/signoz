import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { DISPLAY_TYPES } from 'constants/queryBuilder';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import getChartData, { GetChartDataProps } from 'lib/getChartData';
import { colors } from 'lib/getRandomColor';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { NotFoundContainer } from './styles';

function WidgetGraph({
	selectedGraph,
	yAxisUnit,
	selectedTime,
}: WidgetGraphProps): JSX.Element {
	const createDataset: Required<GetChartDataProps>['createDataset'] = (
		element,
		index,
		allLabels,
	) => ({
		fill: true,
		label: allLabels[index],
		borderColor: colors[index % colors.length] || 'red',
		backgroundColor: colors[index % colors.length] || 'red',
		data: element,
		borderWidth: 1.5,
		spanGaps: true,
		animations: false,
		showLine: true,
		pointRadius: 0,
	});

	const urlQuery = useUrlQuery();
	const display = urlQuery.get('display');
	const { stagedQuery } = useQueryBuilder();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets = [] } = data;
	const { search } = useLocation();

	const params = new URLSearchParams(search);
	const widgetId = params.get('widgetId');

	const selectedWidget = widgets.find((e) => e.id === widgetId);

	const getWidgetQueryRange = useGetWidgetQueryRange({
		graphType: selectedGraph,
		selectedTime: selectedTime.enum,
	});

	if (selectedWidget === undefined) {
		return <Card>Invalid widget</Card>;
	}

	const { title, opacity, isStacked, query } = selectedWidget;

	if (getWidgetQueryRange.error) {
		return (
			<NotFoundContainer>
				<Typography>{getWidgetQueryRange.error.message}</Typography>
			</NotFoundContainer>
		);
	}
	if (getWidgetQueryRange.isLoading) {
		return <Spinner size="large" tip="Loading..." />;
	}
	if (getWidgetQueryRange.data?.payload.data.result.length === 0) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}

	const chartDataSet = getChartData({
		queryData: [
			{ queryData: getWidgetQueryRange.data?.payload.data.result ?? [] },
		],
		...(display === DISPLAY_TYPES.AREA ? { createDataset } : {}),
	});

	return (
		<GridPanelSwitch
			title={title}
			isStacked={isStacked}
			opacity={opacity}
			data={chartDataSet}
			panelType={selectedGraph}
			name={widgetId || 'legend_widget'}
			yAxisUnit={yAxisUnit}
			panelData={
				getWidgetQueryRange.data?.payload.data.newResult.data.result || []
			}
			query={stagedQuery || query}
		/>
	);
}

export default WidgetGraph;
