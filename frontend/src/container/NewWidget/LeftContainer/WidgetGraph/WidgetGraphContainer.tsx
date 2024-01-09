import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import useUrlQuery from 'hooks/useUrlQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';

import { NotFoundContainer } from './styles';
import WidgetGraph from './WidgetGraphs';

function WidgetGraphContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
	fillSpans = false,
	softMax,
	softMin,
}: WidgetGraphProps): JSX.Element {
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
		return <Card>Invalid widget</Card>;
	}

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

	return (
		<WidgetGraph
			yAxisUnit={yAxisUnit || ''}
			getWidgetQueryRange={getWidgetQueryRange}
			selectedWidget={selectedWidget}
			thresholds={thresholds}
			fillSpans={fillSpans}
			softMax={softMax}
			softMin={softMin}
		/>
	);
}

export default WidgetGraphContainer;
