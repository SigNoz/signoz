import uPlot from 'uplot';

import { PlotMode } from '../../../config/types';
import { UPlotConfigBuilder } from '../../../config/UPlotConfigBuilder';
import {
	applyScatterPlugin,
	createScatterPlugin,
	SCATTER_FACETS,
} from '../scatterPlugin';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils', () => ({
	getStoredSeriesVisibility: jest.fn(),
}));

/** jsdom has no Path2D; the builder only needs something that takes the calls. */
class FakePath2D {
	moveTo = jest.fn();
	arc = jest.fn();
}

type OrientCallback = Parameters<typeof uPlot.orient>[2];

interface FakePlotArgs {
	series: Array<{ xs: number[]; ys: number[]; sizes?: Array<number | null> }>;
	cursor?: { left: number; top: number };
	scaleX?: { min: number; max: number };
	scaleY?: { min: number; max: number };
}

/**
 * A 100×100 plot at the canvas origin with identity scales: value 10 draws at
 * pixel 10 on x, and at 100 − 10 on y (uPlot's y grows downward).
 */
function createFakePlot({
	series,
	cursor = { left: -1, top: -1 },
	scaleX = { min: 0, max: 100 },
	scaleY = { min: 0, max: 100 },
}: FakePlotArgs): uPlot {
	const data = [
		null,
		...series.map((entry) =>
			entry.sizes ? [entry.xs, entry.ys, entry.sizes] : [entry.xs, entry.ys],
		),
	];
	return {
		data,
		series: [{}, ...series.map((_, index) => ({ label: `s${index + 1}` }))],
		bbox: { left: 0, top: 0, width: 100, height: 100 },
		cursor,
		scales: { x: scaleX, y: scaleY },
	} as unknown as uPlot;
}

/** Stands in for `uPlot.orient`: identity x, flipped y, an `arc` that records. */
function orientWithIdentityScales(
	u: uPlot,
	seriesIdx: number,
	cb: OrientCallback,
): void {
	const columns = (u.data as unknown as Array<number[][] | null>)[seriesIdx];
	if (!columns) {
		return;
	}
	const scaleX = (u.scales as unknown as Record<string, uPlot.Scale>).x;
	const scaleY = (u.scales as unknown as Record<string, uPlot.Scale>).y;
	const valToPosX = (value: number): number => value;
	const valToPosY = (value: number): number => 100 - value;
	// Real uPlot's `arc` helper forwards to the path; the test counts those calls.
	const arc = (path: FakePath2D, ...args: number[]): void => {
		path.arc(...args);
	};
	cb(
		u.series[seriesIdx],
		columns[0],
		columns[1],
		scaleX,
		scaleY,
		valToPosX as unknown as uPlot.ValToPos,
		valToPosY as unknown as uPlot.ValToPos,
		0,
		0,
		100,
		100,
		jest.fn() as never,
		jest.fn() as never,
		jest.fn() as never,
		arc as never,
		jest.fn() as never,
	);
}

describe('createScatterPlugin', () => {
	beforeAll(() => {
		(globalThis as { Path2D?: unknown }).Path2D = FakePath2D;
	});

	beforeEach(() => {
		(uPlot.orient as jest.Mock).mockImplementation(orientWithIdentityScales);
	});

	afterEach(() => {
		(uPlot.orient as jest.Mock).mockReset();
	});

	function drawAll(
		u: uPlot,
		plugin: ReturnType<typeof createScatterPlugin>,
	): void {
		plugin.hooks.drawClear(u);
		for (let seriesIdx = 1; seriesIdx < u.series.length; seriesIdx++) {
			const columns = (u.data as unknown as number[][][])[seriesIdx];
			plugin.pathBuilder(u, seriesIdx, 0, columns[0].length - 1);
		}
	}

	/** Runs the cursor scan the way uPlot does: every data series, in order. */
	function scan(
		u: uPlot,
		plugin: ReturnType<typeof createScatterPlugin>,
	): Array<number | null> {
		const dataIdx = plugin.cursor.dataIdx as NonNullable<uPlot.Cursor['dataIdx']>;
		const indexes: Array<number | null> = [null];
		for (let seriesIdx = 1; seriesIdx < u.series.length; seriesIdx++) {
			indexes.push(dataIdx(u, seriesIdx, 0, 0));
		}
		return indexes;
	}

	it('returns one path that strokes and fills the same discs', () => {
		const plugin = createScatterPlugin();
		const u = createFakePlot({ series: [{ xs: [10, 20], ys: [10, 20] }] });
		plugin.hooks.drawClear(u);

		const paths = plugin.pathBuilder(u, 1, 0, 1) as uPlot.Series.Paths;

		expect(paths.stroke).toBeInstanceOf(FakePath2D);
		expect(paths.fill).toBe(paths.stroke);
		expect((paths.fill as unknown as FakePath2D).arc).toHaveBeenCalledTimes(2);
	});

	it('resolves the hovered point to its own series and index', () => {
		const plugin = createScatterPlugin({
			pointSize: { fixed: 6, min: 4, max: 20 },
		});
		const u = createFakePlot({
			series: [
				{ xs: [10, 50], ys: [10, 50] },
				{ xs: [80], ys: [80] },
			],
			// Over the second series' only point: x 80, y drawn at 100 − 80.
			cursor: { left: 80, top: 20 },
		});
		drawAll(u, plugin);

		expect(scan(u, plugin)).toStrictEqual([null, null, 0]);
		expect(plugin.getHit()).toMatchObject({ seriesIndex: 2, dataIndex: 0 });
	});

	it('returns null for every series when the cursor is off the plot or off any disc', () => {
		const plugin = createScatterPlugin();
		const u = createFakePlot({
			series: [{ xs: [10], ys: [10] }],
			cursor: { left: -1, top: -1 },
		});
		drawAll(u, plugin);

		expect(scan(u, plugin)).toStrictEqual([null, null]);

		(u.cursor as { left: number; top: number }).left = 50;
		(u.cursor as { left: number; top: number }).top = 50;
		expect(scan(u, plugin)).toStrictEqual([null, null]);
	});

	it('skips points outside the visible scale range', () => {
		const plugin = createScatterPlugin();
		const u = createFakePlot({
			series: [{ xs: [10, 500], ys: [10, 10] }],
			cursor: { left: 10, top: 90 },
		});
		drawAll(u, plugin);

		const paths = plugin.pathBuilder(u, 1, 0, 1) as uPlot.Series.Paths;
		expect((paths.fill as unknown as FakePath2D).arc).toHaveBeenCalledTimes(1);
		expect(scan(u, plugin)).toStrictEqual([null, 0]);
	});

	it('sizes the hover marker from the hit disc, in CSS pixels', () => {
		const plugin = createScatterPlugin({
			pointSize: { fixed: 8, min: 4, max: 20 },
		});
		const u = createFakePlot({
			series: [{ xs: [10], ys: [10] }],
			cursor: { left: 10, top: 90 },
		});
		drawAll(u, plugin);
		scan(u, plugin);

		const bbox = plugin.cursor.points?.bbox;
		expect(bbox?.(u, 1)).toStrictEqual({ left: 6, top: 86, width: 8, height: 8 });
		expect(bbox?.(u, 2)).toMatchObject({ width: 0, height: 0 });
	});

	it('drawClear drops cached paths on data series only', () => {
		const plugin = createScatterPlugin();
		const u = createFakePlot({ series: [{ xs: [1], ys: [1] }] });
		const [xSeries, dataSeries] = u.series as Array<{ _paths?: unknown }>;
		xSeries._paths = 'x';
		dataSeries._paths = 'cached';

		plugin.hooks.drawClear(u);

		expect(xSeries._paths).toBe('x');
		expect(dataSeries._paths).toBeNull();
	});

	it('focus distance is zero, so the hit series wins focus', () => {
		const plugin = createScatterPlugin();
		expect(plugin.cursor.focus?.dist?.({} as uPlot, 1, 0, 0, 0)).toBe(0);
	});
});

describe('applyScatterPlugin', () => {
	it('switches the builder to faceted mode and disables drag selection', () => {
		const builder = new UPlotConfigBuilder({ id: 'scatter' });
		const plugin = createScatterPlugin();

		applyScatterPlugin(builder, plugin);
		const config = builder.getConfig();

		expect(builder.getMode()).toBe(PlotMode.Faceted);
		expect(config.mode).toBe(2);
		expect(config.cursor?.drag).toMatchObject({
			x: false,
			y: false,
			setScale: false,
		});
		expect(config.hooks?.drawClear).toHaveLength(1);
		expect(config.hooks?.destroy).toHaveLength(1);
	});

	it('facets read x and y against the shared scales', () => {
		expect(SCATTER_FACETS).toStrictEqual([
			{ scale: 'x', auto: true },
			{ scale: 'y', auto: true },
		]);
	});
});
