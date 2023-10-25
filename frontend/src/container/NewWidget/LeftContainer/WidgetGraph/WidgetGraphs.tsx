import GridPanelSwitch from 'container/GridPanelSwitch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useDimensions } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import { getUPlotChartData, getUPlotChartOptions } from 'lib/getUplotChartData';
import { useMemo, useRef } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function WidgetGraph({
	getWidgetQueryRange,
	selectedWidget,
	yAxisUnit,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const graphRef = useRef<HTMLDivElement>(null);

	const containerDimensions = useDimensions(graphRef);

	const chartData = getUPlotChartData(
		getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
	);
	const isDarkMode = useIsDarkMode();

	const params = useUrlQuery();

	const widgetId = params.get('widgetId');

	const options = useMemo(
		() =>
			getUPlotChartOptions(
				getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
				containerDimensions,
				isDarkMode,
			),
		[
			getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
			containerDimensions,
			isDarkMode,
		],
	);

	return (
		<div ref={graphRef} style={{ height: '100%' }}>
			<GridPanelSwitch
				data={chartData}
				options={options}
				panelType={selectedWidget.panelTypes}
				name={widgetId || 'legend_widget'}
				yAxisUnit={yAxisUnit}
				panelData={
					getWidgetQueryRange.data?.payload.data.newResult.data.result || []
				}
				query={stagedQuery || selectedWidget.query}
			/>
		</div>
	);
}

interface WidgetGraphProps {
	yAxisUnit: string;
	selectedWidget: Widgets;
	getWidgetQueryRange: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}

export default WidgetGraph;
