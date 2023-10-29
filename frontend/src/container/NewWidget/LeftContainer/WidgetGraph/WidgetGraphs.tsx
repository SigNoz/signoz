import GridPanelSwitch from 'container/GridPanelSwitch';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import { getUPlotChartData, getUPlotChartOptions } from 'lib/getUplotChartData';
import { useCallback, useMemo, useRef } from 'react';
import { UseQueryResult } from 'react-query';
import { useDispatch } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
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

	const containerDimensions = useResizeObserver(graphRef);

	const chartData = getUPlotChartData(
		getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
	);
	const isDarkMode = useIsDarkMode();

	const params = useUrlQuery();

	const widgetId = params.get('widgetId');

	const dispatch = useDispatch();

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch],
	);

	const options = useMemo(
		() =>
			getUPlotChartOptions({
				yAxisUnit,
				apiResponse: getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
				dimensions: containerDimensions,
				isDarkMode,
				onDragSelect,
				widgetMetaData: getWidgetQueryRange?.data?.payload?.data?.result,
			}),
		[
			yAxisUnit,
			getWidgetQueryRange?.data?.payload?.data?.newResult?.data,
			getWidgetQueryRange?.data?.payload?.data?.result,
			containerDimensions,
			isDarkMode,
			onDragSelect,
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
