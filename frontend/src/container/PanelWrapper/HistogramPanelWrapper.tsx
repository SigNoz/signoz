import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotHistogramChartOptions } from 'lib/uPlotLib/getUplotHistogramChartOptions';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useMemo, useRef } from 'react';

import { buildHistogramData } from './histogram';
import { PanelWrapperProps } from './panelWrapper.types';

function HistogramPanelWrapper({
	queryResponse,
	widget,
}: PanelWrapperProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);

	const histogramData = buildHistogramData(
		queryResponse.data?.payload.data.result,
	);

	useEffect(() => {
		if (toScrollWidgetId === widget.id) {
			graphRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			graphRef.current?.focus();
			setToScrollWidgetId('');
		}
	}, [toScrollWidgetId, setToScrollWidgetId, widget.id]);
	const lineChartRef = useRef<ToggleGraphProps>();

	const histogramOptions = useMemo(
		() =>
			getUplotHistogramChartOptions({
				id: widget.id,
				dimensions: containerDimensions,
				isDarkMode,
				apiResponse: queryResponse.data?.payload,
				histogramData,
				panelType: widget.panelTypes,
			}),
		[
			containerDimensions,
			histogramData,
			isDarkMode,
			queryResponse.data?.payload,
			widget.id,
			widget.panelTypes,
		],
	);

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={histogramOptions} data={histogramData} ref={lineChartRef} />
		</div>
	);
}

export default HistogramPanelWrapper;
