import type uPlot from 'uplot';

import { measureBar, reportBarRect } from '../barRect';

function plotWithPaths(paths?: uPlot.Series['paths']): uPlot {
	return { series: [{}, { paths }] } as unknown as uPlot;
}

describe('measureBar', () => {
	it('returns the rect the bar paths report for that index', () => {
		const paths = jest.fn((u: uPlot, seriesIdx: number, idx: number) => {
			reportBarRect(u, seriesIdx, idx, 10, 20, 8, 30);
			return null;
		});
		const u = plotWithPaths(paths);

		expect(measureBar(u, 1, 4)).toStrictEqual({
			left: 10,
			top: 20,
			width: 8,
			height: 30,
		});
		expect(paths).toHaveBeenCalledWith(u, 1, 4, 4);
	});

	it('returns null for series whose paths report no bar', () => {
		expect(measureBar(plotWithPaths(jest.fn(() => null)), 1, 0)).toBeNull();
		expect(measureBar(plotWithPaths(), 1, 0)).toBeNull();
	});
});
