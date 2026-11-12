import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot from 'uplot';

import { DistributionXAxis } from './types';

export function createBoundFormatter(
	unit?: string,
	decimalPrecision?: PrecisionOption,
): (value: number) => string {
	return (value: number): string =>
		getToolTipValue(String(value), unit, decimalPrecision);
}

/**
 * `[bucket centres, ...counts per series]`. The series draw from the layout, so the
 * data only feeds uPlot's cursor and tooltip.
 */
export function prepareDistributionChartData(
	xAxis: DistributionXAxis,
	counts: number[][],
): uPlot.AlignedData {
	const centres = xAxis.rows.map(
		(_, index) => (xAxis.edges[index] + xAxis.edges[index + 1]) / 2,
	);
	return [
		centres,
		...counts.map((seriesCounts) =>
			centres.map((_, index) => seriesCounts[index] ?? 0),
		),
	] as unknown as uPlot.AlignedData;
}
