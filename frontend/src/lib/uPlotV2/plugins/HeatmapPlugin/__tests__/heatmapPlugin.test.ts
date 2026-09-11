import type uPlot from 'uplot';

import { DEFAULT_HEATMAP_COLORS } from '../colorScale';
import { resolveHeatmapYAxis } from '../geometry';
import { createHeatmapHooks } from '../heatmapPlugin';
import { HeatmapAxisScale, HeatmapCell } from '../types';

const BOUNDS = [100, 1000];
const Y_AXIS = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Linear);
const TIMESTAMPS = [1000, 1060, 1120];
const STEP = 60;
const PLOT_WIDTH = 300;
const PLOT_HEIGHT = 300;

// Three rows for two bounds, three columns; row 1 column 1 is a data gap.
const DATA = [
	TIMESTAMPS,
	[1, 2, 3],
	[4, null, 6],
	[7, 8, 9],
] as unknown as uPlot.AlignedData;

interface FakeContext {
	fillRect: jest.Mock;
	fills: string[];
}

interface FakePlot {
	plot: uPlot;
	context: FakeContext;
	setSeries: jest.Mock;
	over: HTMLDivElement;
}

function createFakePlot(cursor: { left: number; top: number }): FakePlot {
	const over = document.createElement('div');
	Object.defineProperty(over, 'clientWidth', { value: PLOT_WIDTH });
	Object.defineProperty(over, 'clientHeight', { value: PLOT_HEIGHT });

	const fills: string[] = [];
	const fillRect = jest.fn();
	const context = { fills, fillRect };
	const setSeries = jest.fn();

	const xSpan = TIMESTAMPS[TIMESTAMPS.length - 1] + STEP - TIMESTAMPS[0];
	const ySpan = Y_AXIS.max - Y_AXIS.min;

	const ctx = {
		save: jest.fn(),
		restore: jest.fn(),
		beginPath: jest.fn(),
		rect: jest.fn(),
		clip: jest.fn(),
		moveTo: jest.fn(),
		lineTo: jest.fn(),
		stroke: jest.fn(),
		setLineDash: jest.fn(),
		createPattern: jest.fn(() => null),
		set fillStyle(value: string) {
			fills.push(value);
		},
		fillRect: (...args: number[]): void => {
			fillRect(...args);
		},
	};

	const plot = {
		data: DATA,
		cursor,
		over,
		setSeries,
		ctx,
		bbox: { left: 0, top: 0, width: PLOT_WIDTH, height: PLOT_HEIGHT },
		scales: { x: { min: TIMESTAMPS[0], max: TIMESTAMPS[2] + STEP } },
		// x grows left to right; y is inverted, so the highest bucket is at the top.
		valToPos: (value: number, scaleKey: string): number =>
			scaleKey === 'x'
				? ((value - TIMESTAMPS[0]) / xSpan) * PLOT_WIDTH
				: PLOT_HEIGHT - ((value - Y_AXIS.min) / ySpan) * PLOT_HEIGHT,
		posToVal: (pos: number, scaleKey: string): number =>
			scaleKey === 'x'
				? TIMESTAMPS[0] + (pos / PLOT_WIDTH) * xSpan
				: Y_AXIS.min + ((PLOT_HEIGHT - pos) / PLOT_HEIGHT) * ySpan,
	};

	return { plot: plot as unknown as uPlot, context, setSeries, over };
}

function createHooks(
	onHoverChange?: (cell: HeatmapCell | null) => void,
	dimOnHover = true,
): ReturnType<typeof createHeatmapHooks> {
	return createHeatmapHooks({
		yAxis: Y_AXIS,
		step: STEP,
		colors: DEFAULT_HEATMAP_COLORS,
		isDarkMode: true,
		seriesColor: '#4e74f8',
		dimOnHover,
		onHoverChange,
	});
}

describe('heatmap renderer — lifecycle', () => {
	it('mounts the hover overlay into the plot overlay and tears it down', () => {
		const hooks = createHooks();
		const { plot, over } = createFakePlot({ left: -10, top: -10 });

		hooks.init(plot);
		expect(
			over.querySelector('[data-testid="heatmap-hover-overlay"]'),
		).not.toBeNull();

		hooks.destroy(plot);
		expect(
			over.querySelector('[data-testid="heatmap-hover-overlay"]'),
		).toBeNull();
	});
});

describe('heatmap renderer — draw', () => {
	it('paints every cell of every visible column', () => {
		const hooks = createHooks();
		const { plot, context } = createFakePlot({ left: -10, top: -10 });

		hooks.init(plot);
		hooks.draw(plot);

		// 3 rows x 3 columns, less the one null cell that has no hatch pattern
		// available under jsdom.
		expect(context.fillRect).toHaveBeenCalledTimes(8);
	});

	it('gives a zero count the bottom-of-scale fill rather than skipping it', () => {
		const hooks = createHooks();
		const zeroed = [TIMESTAMPS, [0, 0, 0], [0, 0, 0], [0, 0, 0]];
		const { plot, context } = createFakePlot({ left: -10, top: -10 });
		(plot as { data: unknown }).data = zeroed;

		hooks.init(plot);
		hooks.draw(plot);

		expect(context.fillRect).toHaveBeenCalledTimes(9);
		expect(new Set(context.fills).size).toBe(1);
	});

	it('skips columns outside the current x range', () => {
		const hooks = createHooks();
		const { plot, context } = createFakePlot({ left: -10, top: -10 });
		(plot as { scales: unknown }).scales = {
			x: { min: TIMESTAMPS[0], max: TIMESTAMPS[0] + STEP },
		};

		hooks.init(plot);
		hooks.draw(plot);

		// Only the first two columns overlap the range; the third starts past its end.
		// 2 columns x 3 rows, less the null cell in column 1.
		expect(context.fillRect).toHaveBeenCalledTimes(5);
	});

	it('draws nothing without columns', () => {
		const hooks = createHooks();
		const { plot, context } = createFakePlot({ left: -10, top: -10 });
		(plot as { data: unknown }).data = [[]];

		hooks.init(plot);
		hooks.draw(plot);

		expect(context.fillRect).not.toHaveBeenCalled();
	});
});

describe('heatmap renderer — hover', () => {
	it('focuses the hovered row and reports the cell under the cursor', () => {
		const onHoverChange = jest.fn();
		const hooks = createHooks(onHoverChange);
		// Left third of the plot is column 0; the top third is the overflow row.
		const { plot, setSeries } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);

		expect(onHoverChange).toHaveBeenCalledWith({ row: 2, column: 0, count: 7 });
		expect(setSeries).toHaveBeenCalledWith(3, { focus: true });
	});

	it('reports a data gap as a null count instead of zero', () => {
		const onHoverChange = jest.fn();
		const hooks = createHooks(onHoverChange);
		const { plot } = createFakePlot({
			left: PLOT_WIDTH / 2,
			top: PLOT_HEIGHT / 2,
		});

		hooks.init(plot);
		hooks.setCursor(plot);

		expect(onHoverChange).toHaveBeenCalledWith({
			row: 1,
			column: 1,
			count: null,
		});
	});

	it('does not re-report the same cell', () => {
		const onHoverChange = jest.fn();
		const hooks = createHooks(onHoverChange);
		const { plot } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);
		hooks.setCursor(plot);

		expect(onHoverChange).toHaveBeenCalledTimes(1);
	});

	it('shows the overlay over the hovered cell and dims around it', () => {
		const hooks = createHooks(undefined, true);
		const { plot, over } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);

		const overlay = over.querySelector<HTMLDivElement>(
			'[data-testid="heatmap-hover-overlay"]',
		);
		expect(overlay?.style.display).toBe('block');
		// Column 0 spans the left third of a 300px plot.
		expect(overlay?.lastElementChild).toHaveStyle({
			left: '0px',
			width: '100px',
		});
	});

	it('collapses the dim rects when dimming is off', () => {
		const hooks = createHooks(undefined, false);
		const { plot, over } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);

		const overlay = over.querySelector<HTMLDivElement>(
			'[data-testid="heatmap-hover-overlay"]',
		);
		expect(overlay?.firstElementChild).toHaveStyle({
			width: '0px',
			height: '0px',
		});
	});

	it('releases focus and hides the overlay when the cursor leaves', () => {
		const onHoverChange = jest.fn();
		const hooks = createHooks(onHoverChange);
		const { plot, over, setSeries } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);
		(plot as { cursor: { left: number; top: number } }).cursor = {
			left: -10,
			top: -10,
		};
		hooks.setCursor(plot);

		expect(onHoverChange).toHaveBeenLastCalledWith(null);
		expect(setSeries).toHaveBeenLastCalledWith(null, { focus: true });
		expect(
			over.querySelector<HTMLDivElement>('[data-testid="heatmap-hover-overlay"]')
				?.style.display,
		).toBe('none');
	});

	it('clears the hover when the cursor is inside the plot but past the last column', () => {
		const onHoverChange = jest.fn();
		const hooks = createHooks(onHoverChange);
		const { plot } = createFakePlot({ left: 10, top: 10 });

		hooks.init(plot);
		hooks.setCursor(plot);
		(plot as { data: unknown }).data = [[], [], [], []];
		(plot as { cursor: { left: number; top: number } }).cursor = {
			left: 10,
			top: 10,
		};
		hooks.setCursor(plot);

		expect(onHoverChange).toHaveBeenLastCalledWith(null);
	});
});
