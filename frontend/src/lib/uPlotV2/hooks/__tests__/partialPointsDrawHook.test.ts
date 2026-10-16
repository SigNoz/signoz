import uPlot from 'uplot';

import type { ExtendedSeries } from '../../config/types';
import { reportBarRect } from '../../utils/barRect';
import { partialPointsDrawHook } from '../partialPointsDrawHook';

function createPlot(
	series: Partial<ExtendedSeries>,
	values: (number | null)[] = [1, 2, 3],
): { u: uPlot; ctx: Record<string, jest.Mock> } {
	const ctx = {
		save: jest.fn(),
		restore: jest.fn(),
		beginPath: jest.fn(),
		rect: jest.fn(),
		clip: jest.fn(),
		arc: jest.fn(),
		fill: jest.fn(),
		stroke: jest.fn(),
		setLineDash: jest.fn(),
		strokeRect: jest.fn(),
	};
	const xValues = [10, 20, 30];
	const u = {
		ctx,
		bbox: { left: 0, top: 0, width: 100, height: 100 },
		data: [xValues, values],
		series: [{}, { show: true, stroke: 'red', points: { size: 4 }, ...series }],
		valToIdx: (value: number): number => xValues.indexOf(value),
		valToPos: (value: number): number => value,
	} as unknown as uPlot;
	return { u, ctx };
}

describe('partialPointsDrawHook', () => {
	it('draws a dot and a dotted ring on each partial point', () => {
		const { u, ctx } = createPlot({ partialTimestamps: new Set([30]) });

		partialPointsDrawHook(u);

		expect(ctx.arc).toHaveBeenCalledTimes(2);
		expect(ctx.arc).toHaveBeenCalledWith(30, 3, 2, 0, 2 * Math.PI);
		expect(ctx.arc).toHaveBeenCalledWith(30, 3, 5, 0, 2 * Math.PI);
		expect(ctx.setLineDash).toHaveBeenCalledWith([2, 2]);
		expect(ctx.restore).toHaveBeenCalled();
	});

	it('skips hidden series, null values and timestamps not in the data', () => {
		const hidden = createPlot({ show: false, partialTimestamps: new Set([30]) });
		const missing = createPlot({ partialTimestamps: new Set([30]) }, [
			1,
			2,
			null,
		]);
		const unknown = createPlot({ partialTimestamps: new Set([40]) });

		[hidden, missing, unknown].forEach(({ u, ctx }) => {
			partialPointsDrawHook(u);
			expect(ctx.arc).not.toHaveBeenCalled();
		});
	});

	it('draws a dotted outline around a partial bar', () => {
		const { u, ctx } = createPlot({
			partialTimestamps: new Set([30]),
			paths: (plot, seriesIdx, idx) => {
				reportBarRect(plot, seriesIdx, idx, 10, 20, 8, 30);
				return null;
			},
		});

		partialPointsDrawHook(u);

		expect(ctx.strokeRect).toHaveBeenCalledWith(7, 17, 14, 36);
		expect(ctx.arc).not.toHaveBeenCalled();
	});
});
