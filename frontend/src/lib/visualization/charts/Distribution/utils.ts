import uPlot from 'uplot';

import { DistributionXAxis } from './types';

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
	];
}
