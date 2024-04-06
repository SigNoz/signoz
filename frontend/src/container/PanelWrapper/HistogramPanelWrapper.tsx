import { ToggleGraphProps } from 'components/Graph/types';
import Uplot from 'components/Uplot';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUplotHistogramChartOptions } from 'lib/uPlotLib/getUplotHistogramChartOptions';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useRef } from 'react';

import { buildHistogramData } from './histogram';
import { PanelWrapperProps } from './panelWrapper.types';

function HistogramPanelWrapper({
	queryResponse,
	widget,
}: PanelWrapperProps): JSX.Element {
	console.log({ queryResponse });
	const histogramData = buildHistogramData(
		queryResponse.data?.payload.data.result,
	);

	const graphRef = useRef<HTMLDivElement>(null);
	const { currentQuery } = useQueryBuilder();
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();
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

	const isDarkMode = useIsDarkMode();
	const containerDimensions = useResizeObserver(graphRef);
	const histogramOptions = getUplotHistogramChartOptions({
		id: widget.id,
		dimensions: containerDimensions,
		isDarkMode,
		apiResponse: queryResponse.data?.payload,
		histogramData,
		panelType: widget.panelTypes,
		currentQuery,
	});

	return (
		<div style={{ height: '100%', width: '100%' }} ref={graphRef}>
			<Uplot options={histogramOptions} data={histogramData} ref={lineChartRef} />
		</div>
	);
}

export default HistogramPanelWrapper;
