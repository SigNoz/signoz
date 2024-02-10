import { InfoCircleOutlined } from '@ant-design/icons';
import { Card } from 'container/GridCardLayout/styles';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo } from 'react';

import { WidgetGraphProps } from '../../types';
import PlotTag from './PlotTag';
import { AlertIconContainer, Container } from './styles';
import WidgetGraphComponent from './WidgetGraphContainer';

function WidgetGraph({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
	fillSpans,
	softMax,
	softMin,
}: WidgetGraphProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { selectedDashboard } = useDashboard();

	const { widgets = [] } = selectedDashboard?.data || {};

	const params = useUrlQuery();

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
				thresholds={thresholds}
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
				fillSpans={fillSpans}
				softMax={softMax}
				softMin={softMin}
			/>
		</Container>
	);
}

export default memo(WidgetGraph);
