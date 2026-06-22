import { LegendPosition } from 'lib/uPlotV2/components/types';

import { calculateChartDimensions } from '../utils';

const labels = (count: number, length = 20): string[] =>
	Array.from({ length: count }, (_, i) =>
		`label-${i}`.padEnd(length, 'x').slice(0, length),
	);

describe('calculateChartDimensions', () => {
	it('returns all zeros when the container has no space', () => {
		expect(
			calculateChartDimensions({
				containerWidth: 0,
				containerHeight: 300,
				legendConfig: { position: LegendPosition.BOTTOM },
				seriesLabels: labels(3),
			}),
		).toStrictEqual({
			width: 0,
			height: 0,
			legendWidth: 0,
			legendHeight: 0,
			averageLegendWidth: 0,
		});
	});

	it('RIGHT: reserves a side column capped at 30% of the width and keeps full height', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(10, 40),
		});
		// 40-char labels approximate to 336px, capped at min(240, 30% of 1000).
		expect(dims.legendWidth).toBe(240);
		expect(dims.width).toBe(760);
		expect(dims.height).toBe(400);
		expect(dims.legendHeight).toBe(400);
	});

	it('BOTTOM: a single row of items reserves one legend row', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(3),
		});
		// One row = line height (28) + padding (12).
		expect(dims.legendHeight).toBe(40);
		expect(dims.height).toBe(460);
		expect(dims.legendWidth).toBe(1000);
	});

	it('BOTTOM: many items cap at two rows on a tall container', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(40),
		});
		// Two rows = 2 * 40 - 12 (no trailing padding) = 68, under the 80px cap.
		expect(dims.legendHeight).toBe(68);
		expect(dims.height).toBe(432);
	});

	it('BOTTOM: on a short container the legend never takes more than 30% of the height', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 160,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(40),
		});
		// Without the height-relative cap the legend would take 68px of a 160px
		// panel and the chart (pie especially) collapses to a sliver.
		expect(dims.legendHeight).toBe(48); // 30% of 160
		expect(dims.height).toBe(112);
	});
});
