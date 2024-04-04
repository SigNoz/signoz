import GridValueComponent from 'container/GridValueComponent';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';

import { PanelWrapperProps } from './panelWrapper.types';

function ValuePanelWrapper({
	widget,
	queryResponse,
}: PanelWrapperProps): JSX.Element {
	const { yAxisUnit, thresholds } = widget;
	const data = getUPlotChartData(queryResponse?.data?.payload);
	return (
		<GridValueComponent
			data={data}
			yAxisUnit={yAxisUnit}
			thresholds={thresholds}
		/>
	);
}

export default ValuePanelWrapper;
