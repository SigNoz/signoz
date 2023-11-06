import { WarningOutlined } from '@ant-design/icons';
import { Card, Tooltip, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	errorTooltipPosition,
	tooltipStyles,
	WARNING_MESSAGE,
} from 'container/GridCardLayout/WidgetHeader/config';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import getChartData from 'lib/getChartData';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useLocation } from 'react-router-dom';

import { NotFoundContainer } from './styles';

function WidgetGraph({
	selectedGraph,
	yAxisUnit,
	selectedTime,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedDashboard } = useDashboard();

	const { widgets = [] } = selectedDashboard?.data || {};
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
		createDataset: undefined,
		isWarningLimit: selectedWidget.panelTypes === PANEL_TYPES.TIME_SERIES,
	});

	return (
		<>
			{chartDataSet.isWarning && (
				<Tooltip title={WARNING_MESSAGE} placement={errorTooltipPosition}>
					<WarningOutlined style={tooltipStyles} />
				</Tooltip>
			)}

			<GridPanelSwitch
				title={title}
				isStacked={isStacked}
				opacity={opacity}
				data={chartDataSet.data}
				panelType={selectedGraph}
				name={widgetId || 'legend_widget'}
				yAxisUnit={yAxisUnit}
				panelData={
					getWidgetQueryRange.data?.payload.data.newResult.data.result || []
				}
				query={stagedQuery || query}
			/>
		</>
	);
}

export default WidgetGraph;
