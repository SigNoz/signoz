import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridGraphComponent from 'container/GridGraphComponent';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { QueryTable } from 'container/QueryTable';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import getChartData from 'lib/getChartData';
import { useMemo } from 'react';
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

	const { stagedQuery } = useQueryBuilder();

	const getWidgetQueryRange = useGetWidgetQueryRange({
		graphType: selectedGraph,
		selectedTime: selectedTime.enum,
	});

	const currentData = useMemo(
		() => getWidgetQueryRange.data?.payload.data.newResult.data.result || [],
		[getWidgetQueryRange.data?.payload.data.newResult.data.result],
	);

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

	if (selectedGraph === PANEL_TYPES.TABLE && stagedQuery) {
		return (
			<QueryTable
				sticky
				size="small"
				query={stagedQuery}
				queryTableData={currentData}
				bordered={false}
				scroll={{
					x: 'max-content',
					y: 'max-content',
				}}
			/>
		);
	}

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

export default WidgetGraph;
