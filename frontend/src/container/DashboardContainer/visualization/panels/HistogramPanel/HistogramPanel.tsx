import { useMemo, useRef } from 'react';
import { useScrollWidgetIntoView } from 'container/DashboardContainer/visualization/hooks/useScrollWidgetIntoView';
import { PanelWrapperProps } from 'container/PanelWrapper/panelWrapper.types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { useTimezone } from 'providers/Timezone';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import Histogram from '../../charts/Histogram/Histogram';
import ChartManager from '../../components/ChartManager/ChartManager';
import {
	prepareHistogramPanelConfig,
	prepareHistogramPanelData,
} from './utils';

import '../Panel.styles.scss';

function HistogramPanel(props: PanelWrapperProps): JSX.Element {
	const {
		panelMode,
		queryResponse,
		widget,
		isFullViewMode,
		onToggleModelHandler,
	} = props;
	const uPlotRef = useRef<uPlot | null>(null);
	const graphRef = useRef<HTMLDivElement>(null);
	const containerDimensions = useResizeObserver(graphRef);

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();

	useScrollWidgetIntoView(widget.id, graphRef);

	const config = useMemo(() => {
		return prepareHistogramPanelConfig({
			widget,
			isDarkMode,
			apiResponse: queryResponse?.data?.payload as MetricRangePayloadProps,
			panelMode,
		});
	}, [widget, isDarkMode, queryResponse?.data?.payload, panelMode]);

	const chartData = useMemo(() => {
		if (!queryResponse?.data?.payload) {
			return [];
		}
		return prepareHistogramPanelData({
			apiResponse: queryResponse?.data?.payload as MetricRangePayloadProps,
			bucketWidth: widget?.bucketWidth,
			bucketCount: widget?.bucketCount,
			mergeAllActiveQueries: widget?.mergeAllActiveQueries,
		});
	}, [
		queryResponse?.data?.payload,
		widget?.bucketWidth,
		widget?.bucketCount,
		widget?.mergeAllActiveQueries,
	]);

	const layoutChildren = useMemo(() => {
		if (!isFullViewMode || widget.mergeAllActiveQueries) {
			return null;
		}
		return (
			<ChartManager
				config={config}
				alignedData={chartData}
				yAxisUnit={widget.yAxisUnit}
				onCancel={onToggleModelHandler}
			/>
		);
	}, [
		isFullViewMode,
		config,
		chartData,
		widget.yAxisUnit,
		onToggleModelHandler,
		widget.mergeAllActiveQueries,
	]);

	return (
		<div className="panel-container" ref={graphRef}>
			{containerDimensions.width > 0 && containerDimensions.height > 0 && (
				<Histogram
					config={config}
					legendConfig={{
						position: widget?.legendPosition ?? LegendPosition.BOTTOM,
					}}
					plotRef={(plot: uPlot | null): void => {
						uPlotRef.current = plot;
					}}
					onDestroy={(): void => {
						uPlotRef.current = null;
					}}
					isQueriesMerged={widget.mergeAllActiveQueries}
					yAxisUnit={widget.yAxisUnit}
					decimalPrecision={widget.decimalPrecision}
					syncMode={DashboardCursorSync.Crosshair}
					timezone={timezone.value}
					data={chartData as uPlot.AlignedData}
					width={containerDimensions.width}
					height={containerDimensions.height}
					layoutChildren={layoutChildren}
				/>
			)}
		</div>
	);
}

export default HistogramPanel;
