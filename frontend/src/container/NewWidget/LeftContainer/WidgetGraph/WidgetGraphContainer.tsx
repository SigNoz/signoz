import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import useUrlQuery from 'hooks/useUrlQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

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

	const getWidgetQueryRange = useGetWidgetQueryRange(
		{
			graphType: getGraphType(selectedGraph),
			selectedTime: selectedTime.enum,
		},
		selectedDashboard?.data?.version || DEFAULT_ENTITY_VERSION,
	);

	if (getWidgetQueryRange.data && selectedGraph === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			getWidgetQueryRange.data?.payload.data.result,
		);
		getWidgetQueryRange.data.payload.data.result = sortedSeriesData;
	}

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
			selectedLogFields={selectedLogFields}
			selectedTracesFields={selectedTracesFields}
			selectedTime={selectedTime}
			selectedGraph={selectedGraph}
		/>
	);
}

export default WidgetGraphContainer;
