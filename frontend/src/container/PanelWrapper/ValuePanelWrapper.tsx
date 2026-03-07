import GridValueComponent from 'container/GridValueComponent';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';

import { PanelWrapperProps } from './panelWrapper.types';

function ValuePanelWrapper({
	widget,
	queryResponse,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const { yAxisUnit, thresholds } = widget;
	const data = getUPlotChartData(queryResponse?.data?.payload);
	const dataNew = Object.values(
		queryResponse?.data?.payload?.data?.newResult?.data?.result[0]?.table
			?.rows?.[0]?.data || {},
	);

	// this is for handling both query_range v3 and v5 responses
	const gridValueData = data?.[0].length > 0 ? data : [[0], dataNew];

	return (
		<GridValueComponent
			data={gridValueData}
			yAxisUnit={yAxisUnit}
			thresholds={thresholds}
			widget={widget}
			queryResponse={queryResponse}
			contextLinks={widget.contextLinks}
			enableDrillDown={enableDrillDown}
		/>
	);
}

export default ValuePanelWrapper;
