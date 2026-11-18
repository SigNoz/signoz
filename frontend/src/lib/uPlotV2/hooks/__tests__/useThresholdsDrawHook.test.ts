import type uPlot from 'uplot';

import { thresholdsDrawHook } from '../useThresholdsDrawHook';

function mockPlot(ori: 0 | 1): { plot: uPlot; ctx: Record<string, jest.Mock> } {
	const ctx = {
		save: jest.fn(),
		restore: jest.fn(),
		setLineDash: jest.fn(),
		beginPath: jest.fn(),
		moveTo: jest.fn(),
		lineTo: jest.fn(),
		stroke: jest.fn(),
		fillText: jest.fn(),
		measureText: jest.fn(() => ({ width: 40 })),
	};
	const plot = {
		ctx: { ...ctx, canvas: { height: 300 } },
		bbox: { left: 10, top: 20, width: 400, height: 200 },
		scales: { s: { ori } },
		valToPos: (): number => 100,
	} as unknown as uPlot;
	return { plot, ctx };
}

const draw = (plot: uPlot): void =>
	(
		thresholdsDrawHook({
			scaleKey: 's',
			thresholds: [{ thresholdValue: 5, thresholdLabel: 'SLO' }],
		}) as (u: uPlot) => void
	)(plot);

describe('thresholdsDrawHook', () => {
	it('draws a horizontal line across a vertical scale', () => {
		const { plot, ctx } = mockPlot(1);
		draw(plot);

		expect(ctx.moveTo).toHaveBeenCalledWith(10, 100);
		expect(ctx.lineTo).toHaveBeenCalledWith(410, 100);
		expect(ctx.fillText).toHaveBeenCalledWith('SLO', 350, 85);
	});

	it('draws a vertical line across a horizontal scale', () => {
		const { plot, ctx } = mockPlot(0);
		draw(plot);

		expect(ctx.moveTo).toHaveBeenCalledWith(100, 20);
		expect(ctx.lineTo).toHaveBeenCalledWith(100, 220);
		expect(ctx.fillText).toHaveBeenCalledWith(
			'SLO',
			expect.any(Number),
			expect.any(Number),
		);
	});
});
