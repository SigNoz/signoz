import { InfoCircleOutlined } from '@ant-design/icons';
import { Card } from 'container/GridGraphLayout/styles';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { WidgetGraphProps } from '../../types';
import PlotTag from './PlotTag';
import { AlertIconContainer, Container } from './styles';
import WidgetGraphComponent from './WidgetGraph';

function WidgetGraph({
	selectedGraph,
	yAxisUnit,
	selectedTime,
}: WidgetGraphProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { search } = useLocation();

	const { data } = selectedDashboard;

	const { widgets = [] } = data;

	const params = new URLSearchParams(search);
	const widgetId = params.get('widgetId');

	const selectedWidget = widgets.find((e) => e.id === widgetId);

	const getWidgetQueryRange = useGetWidgetQueryRange({
		graphType: selectedGraph,
		selectedTime: selectedTime.enum,
	});

	if (selectedWidget === undefined) {
		return <Card $panelType={selectedGraph}>Invalid widget</Card>;
	}

	return (
		<Container $panelType={selectedGraph}>
			<PlotTag queryType={currentQuery.queryType} panelType={selectedGraph} />
			{getWidgetQueryRange.error && (
				<AlertIconContainer color="red" title={getWidgetQueryRange.error.message}>
					<InfoCircleOutlined />
				</AlertIconContainer>
			)}

			<WidgetGraphComponent
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
			/>
		</Container>
	);
}

export default memo(WidgetGraph);
