import { LegendPosition } from 'lib/uPlotV2/components/types';

import {
	calculateAverageLegendWidth,
	calculateChartDimensions,
} from 'lib/visualization/charts/utils';

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
			showLegendSearch: false,
		});
	});

	it('RIGHT: reserves a side column capped at 320px / 40% of the width and keeps full height', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(10, 40),
		});
		expect(dims.legendWidth).toBe(320);
		expect(dims.width).toBe(680);
		expect(dims.height).toBe(400);
		expect(dims.legendHeight).toBe(400);
	});

	it('RIGHT: sizes the column to the longest label when it fits under the cap', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(5, 20),
		});
		expect(dims.legendWidth).toBe(216);
		expect(dims.width).toBe(784);
	});

	it('RIGHT: never shrinks the column below the floor that fits its chrome', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(3, 3),
		});
		expect(dims.legendWidth).toBe(190);
		expect(dims.width).toBe(810);
	});

	it('RIGHT: on a narrow container the legend keeps its chrome, up to half the width', () => {
		const dims = calculateChartDimensions({
			containerWidth: 300,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(10, 40),
		});
		// 40% is 120px, too narrow for the column's own toolbar.
		expect(dims.legendWidth).toBe(150);
		expect(dims.width).toBe(150);
	});

	it('RIGHT: stops widening the column once the panel is narrower than its chrome', () => {
		const dims = calculateChartDimensions({
			containerWidth: 200,
			containerHeight: 400,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(10, 40),
		});
		expect(dims.legendWidth).toBe(100);
		expect(dims.width).toBe(100);
	});

	it('BOTTOM: items that fit one row reserve exactly one row', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(3),
		});
		// One 28px row + the wrapper's 12px bottom padding.
		expect(dims.legendHeight).toBe(40);
		expect(dims.height).toBe(460);
		expect(dims.legendWidth).toBe(1000);
	});

	it('BOTTOM: more items than one row reserve exactly two rows', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(40),
		});
		// Two 28px rows + 2px gap + 12px padding, plus the 24px search row + 4px.
		expect(dims.showLegendSearch).toBe(true);
		expect(dims.legendHeight).toBe(98);
		expect(dims.height).toBe(402);
	});

	it('BOTTOM: items one past a row still reserve two rows', () => {
		// 1000px wide fits 4 of these per row, so 6 items need a second row.
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(6),
		});
		expect(dims.legendHeight).toBe(70);
	});

	it('BOTTOM: no search row while every item is already on screen', () => {
		// 1000px fits 4 per row, so 8 items fill both reserved rows exactly.
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(8),
		});
		expect(dims.showLegendSearch).toBe(false);
		expect(dims.legendHeight).toBe(70);
	});

	it('BOTTOM: a search row once the grid overflows the reserved rows', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(9),
		});
		expect(dims.showLegendSearch).toBe(true);
		expect(dims.legendHeight).toBe(98);
	});

	it('BOTTOM: no search row when it would push the legend past a short panel', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 120,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(40),
		});
		expect(dims.showLegendSearch).toBe(false);
		expect(dims.legendHeight).toBe(40);
	});

	it('RIGHT: always carries its chrome; the column has the height for it', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 500,
			legendConfig: { position: LegendPosition.RIGHT },
			seriesLabels: labels(40),
		});
		expect(dims.showLegendSearch).toBe(true);
	});

	it('BOTTOM: reserves the rows the grid actually lays out, not the rows a bare width estimate allows', () => {
		// The item width alone suggests three fit on one row; the grid's per-item
		// padding and column gap leave room for two.
		const dims = calculateChartDimensions({
			containerWidth: 412,
			containerHeight: 310,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: ['P99', 'P95', 'P50'],
		});
		expect(dims.legendHeight).toBe(70);
		expect(dims.height).toBe(240);
	});

	it('BOTTOM: drops to a single row rather than take half a short panel', () => {
		const dims = calculateChartDimensions({
			containerWidth: 1000,
			containerHeight: 120,
			legendConfig: { position: LegendPosition.BOTTOM },
			seriesLabels: labels(40),
		});
		// A whole row goes rather than a clipped one being reserved.
		expect(dims.legendHeight).toBe(40);
		expect(dims.height).toBe(80);
	});
});

describe('calculateAverageLegendWidth', () => {
	it('scales with the label length', () => {
		// 16px of chrome + 30 chars at 8px.
		expect(calculateAverageLegendWidth(labels(4, 30))).toBe(256);
	});

	it('never drops below what a row needs to contain its hover actions', () => {
		// Short or unnamed series would otherwise size a column the actions
		// escape, spilling over the item beside it.
		expect(calculateAverageLegendWidth(['cpu'])).toBe(110);
		expect(calculateAverageLegendWidth([''])).toBe(110);
	});

	it('keeps the default estimate when there are no labels to measure', () => {
		expect(calculateAverageLegendWidth([])).toBe(120);
	});
});
