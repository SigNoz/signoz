import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import GridGraphComponent from 'container/GridGraphComponent';
import { NewWidgetProps } from 'container/NewWidget';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import getChartData from 'lib/getChartData';
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

	const { title, opacity, isStacked } = selectedWidget;

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
	});

	return (
		<GridGraphComponent
			title={title}
			isStacked={isStacked}
			opacity={opacity}
			data={chartDataSet}
			GRAPH_TYPES={selectedGraph}
			name={widgetId || 'legend_widget'}
			yAxisUnit={yAxisUnit}
		/>
	);
}

type WidgetGraphProps = NewWidgetProps;

export default WidgetGraph;
