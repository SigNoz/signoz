import GridValueComponent from 'container/WidgetCard/Panels/ValuePanel';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';

import { PanelWrapperProps } from 'container/WidgetCard/Panels/panelWrapper.types';

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

	// a value panel gets a scalar response, which has no series, only a table row
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
