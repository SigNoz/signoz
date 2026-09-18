import { resolveHeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { DEFAULT_HEATMAP_COLORS } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import {
	HeatmapAxisScale,
	HeatmapGrid,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import type uPlot from 'uplot';

import { buildHeatmapConfig, prepareHeatmapChartData } from '../utils';

const GRID: HeatmapGrid = {
	bounds: [128, 256, 1024],
	timestamps: [1000, 1060, 1120],
	step: 60,
	counts: [
		[1, 2, 3],
		[4, null, 6],
		[7, 8, 9],
		[0, 0, 0],
	],
};

const Y_AXIS = resolveHeatmapYAxis(GRID.bounds, HeatmapAxisScale.Log);

/** Tall enough that no tick needs thinning. */
const TALL_PLOT = { bbox: { height: 1000 } } as uPlot;

function readSplits(
	config: ReturnType<typeof buildHeatmapConfig>,
	plot: uPlot,
): number[] {
	const [, yAxisConfig] = config.getConfig().axes ?? [];
	return (yAxisConfig.splits as (self: uPlot) => number[])(plot);
}

function readLabels(
	config: ReturnType<typeof buildHeatmapConfig>,
	splits: number[],
): string[] {
	const [, yAxisConfig] = config.getConfig().axes ?? [];
	return (yAxisConfig.values as (u: uPlot, splits: number[]) => string[])(
		{} as uPlot,
		splits,
	);
}

function readRange(scale?: uPlot.Scale): [number, number] {
	const range = scale?.range as (
		u: uPlot,
		min: number,
		max: number,
	) => [number, number];
	return range({} as uPlot, 0, 0);
}

function buildConfig(
	overrides: Partial<Parameters<typeof buildHeatmapConfig>[0]> = {},
): ReturnType<typeof buildHeatmapConfig> {
	return buildHeatmapConfig({
		id: 'panel-1',
		grid: GRID,
		yAxis: Y_AXIS,
		colors: DEFAULT_HEATMAP_COLORS,
		isDarkMode: true,
		seriesColor: '#4e74f8',
		...overrides,
	});
}

describe('prepareHeatmapChartData', () => {
	it('puts timestamps first and one series per bucket row', () => {
		const data = prepareHeatmapChartData(GRID, Y_AXIS.rows.length);

		expect(data).toHaveLength(Y_AXIS.rows.length + 1);
		expect(data[0]).toStrictEqual(GRID.timestamps);
		expect(data[1]).toStrictEqual([1, 2, 3]);
	});

	it('preserves null cells rather than zeroing them', () => {
		const data = prepareHeatmapChartData(GRID, Y_AXIS.rows.length);

		expect(data[2]).toStrictEqual([4, null, 6]);
	});

	it('pads short rows so every uPlot data array is the same length', () => {
		const data = prepareHeatmapChartData(
			{ ...GRID, counts: [[1]] },
			Y_AXIS.rows.length,
		);

		expect(data[1]).toStrictEqual([1, null, null]);
	});

	it('pads missing rows up to the resolved row count', () => {
		const data = prepareHeatmapChartData({ ...GRID, counts: [] }, 2);

		expect(data).toHaveLength(3);
		expect(data[2]).toStrictEqual([null, null, null]);
	});
});

describe('buildHeatmapConfig', () => {
	it('registers one series per bucket row, plus uPlot"s timestamp series', () => {
		const config = buildHeatmapConfig({
			id: 'panel-1',
			grid: GRID,
			yAxis: Y_AXIS,
			colors: DEFAULT_HEATMAP_COLORS,
			isDarkMode: true,
			seriesColor: '#4e74f8',
		}).getConfig();

		expect(config.series).toHaveLength(Y_AXIS.rows.length + 1);
	});

	it('draws no paths or points per series — the renderer paints the cells', () => {
		const [, firstRow] = buildConfig().getConfig().series ?? [];

		expect((firstRow as uPlot.Series).paths?.({} as uPlot, 1, 0, 1)).toBeNull();
		expect((firstRow as uPlot.Series).points?.show).toBe(false);
	});

	it('labels series by bucket range, including the open-ended rows', () => {
		const labels = (buildConfig().getConfig().series ?? [])
			.slice(1)
			.map((series) => series.label);

		expect(labels[0]).toContain('≤');
		expect(labels[labels.length - 1]).toContain('>');
	});

	it('spans the x scale to the end of the last column, not its start', () => {
		const { x } = buildConfig().getConfig().scales ?? {};

		expect(readRange(x)).toStrictEqual([1000, 1180]);
	});

	it('prefers the query window over the grid extent', () => {
		const { x } =
			buildConfig({ minTimeScale: 900, maxTimeScale: 1500 }).getConfig().scales ??
			{};

		expect(readRange(x)).toStrictEqual([900, 1500]);
	});

	it('pins the y scale to the bucket axis instead of auto-ranging on counts', () => {
		const { y } = buildConfig().getConfig().scales ?? {};

		expect(y?.auto).toBe(false);
		expect(readRange(y)).toStrictEqual([Y_AXIS.min, Y_AXIS.max]);
	});

	it('puts a y tick on every bucket boundary plus the overflow row"s upper edge', () => {
		const splits = readSplits(buildConfig(), TALL_PLOT);

		expect(splits).toStrictEqual([...Y_AXIS.splits, Y_AXIS.overflowSplit]);
	});

	it('labels the overflow edge as infinite and the rest by bucket value', () => {
		const config = buildConfig();
		const labels = readLabels(config, readSplits(config, TALL_PLOT));

		expect(labels[0]).toBe('128');
		expect(labels[labels.length - 1]).toBe('∞');
	});

	it('thins the tick set when the panel is too short to label every boundary', () => {
		const config = buildConfig();
		const splits = readSplits(config, { bbox: { height: 40 } } as uPlot);

		expect(splits.length).toBeLessThan(Y_AXIS.splits.length + 1);
		// The infinite edge is the one label that must never be dropped.
		expect(readLabels(config, splits).at(-1)).toBe('∞');
	});

	it('disables uPlot cursor focus and points, which cannot read a colour axis', () => {
		const config = buildConfig().getConfig();

		expect(config.cursor?.focus?.prox).toBe(-1);
		expect(config.cursor?.points?.show).toBe(false);
	});

	it('keeps focus alpha at 1 so focusing a row does not force a full redraw', () => {
		expect(buildConfig().getConfig().focus?.alpha).toBe(1);
	});

	it('registers the renderer hooks', () => {
		const { hooks } = buildConfig().getConfig();

		expect(hooks?.init).toHaveLength(1);
		expect(hooks?.draw).toHaveLength(1);
		expect(hooks?.setCursor).toHaveLength(1);
		expect(hooks?.destroy).toHaveLength(1);
	});
});
