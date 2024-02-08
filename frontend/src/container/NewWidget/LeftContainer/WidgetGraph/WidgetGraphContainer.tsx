import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useLogsData } from 'hooks/useLogsData';
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
	selectedLogFields,
	selectedTracesFields,
}: WidgetGraphProps): JSX.Element {
	const { selectedDashboard } = useDashboard();

	const { widgets = [] } = selectedDashboard?.data || {};

	const params = useUrlQuery();

	const widgetId = params.get('widgetId');

	const selectedWidget = widgets.find((e) => e.id === widgetId);
	const { stagedQuery } = useQueryBuilder();

	const getWidgetQueryRange = useGetWidgetQueryRange({
		graphType: selectedGraph,
		selectedTime: selectedTime.enum,
	});

	const { logs, handleEndReached } = useLogsData({
		result: getWidgetQueryRange.data?.payload.data.newResult.data.result,
		panelType: selectedGraph,
		stagedQuery,
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

	if (
		selectedGraph !== PANEL_TYPES.LIST &&
		getWidgetQueryRange.data?.payload.data.result.length === 0
	) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}
	if (
		selectedGraph === PANEL_TYPES.LIST &&
		getWidgetQueryRange.data?.payload.data.newResult.data.result.length === 0
	) {
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
			logs={logs}
			selectedLogFields={selectedLogFields}
			handleEndReached={handleEndReached}
			selectedTracesFields={selectedTracesFields}
		/>
	);
}

export default WidgetGraphContainer;
