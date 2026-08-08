import GridValueComponent from 'container/GridValueComponent';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { PanelWrapperProps } from './panelWrapper.types';
import { getValueFromTableResult } from './utils';

function ValuePanelWrapper({
	widget,
	queryResponse,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const { yAxisUnit, thresholds } = widget;
	const payload = queryResponse?.data?.payload;
	const data = getUPlotChartData(payload);

	// A Value panel requests the `scalar` request type, so there are no
	// `series.values` pairs for getUPlotChartData to read. The reduced value
	// instead arrives table-shaped: on `data.result` for v5, and on
	// `data.newResult.data.result` for v3.
	const tableValue =
		getValueFromTableResult(
			payload?.data?.result as unknown as QueryDataV3[] | undefined,
		) ?? getValueFromTableResult(payload?.data?.newResult?.data?.result);

	// this is for handling both query_range v3 and v5 responses
	const gridValueData =
		data?.[0].length > 0
			? data
			: [[0], tableValue === undefined ? [] : [tableValue]];

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
