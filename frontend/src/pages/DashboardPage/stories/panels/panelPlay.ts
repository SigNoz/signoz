/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesHeatmapYScaleDTO as HeatmapYScale,
	DashboardtypesLineStyleDTO as LineStyle,
	DashboardtypesStackModeDTO as StackMode,
} from 'api/generated/services/sigNoz.schemas';
import type { UPlotHostElement } from 'lib/uPlotV2/components/UPlotChart/utils';
import { getPaletteStops } from 'lib/uPlotV2/plugins/HeatmapPlugin/palettes';
import { HEATMAP_PALETTE_MAP } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type uPlot from 'uplot';

import {
	CHART_THRESHOLD_VALUE,
	HEATMAP_BUCKETS,
	NUMBER_VALUE,
	PANEL_NAME,
	TABLE_THRESHOLD_VALUE,
	TABLE_VALUES,
	THRESHOLD_COLOR,
	type Gaps,
	type PanelArgs,
	type PanelResult,
} from './__story_mockdata__/panels';

/** The dashboard document loads before the panel queries, then the chart sizes itself. */
export const PANEL_LOAD = { timeout: 15000 };

/** Rows a List page holds before Next is offered. */
export const LIST_PAGE_SIZE = 25;

export interface PanelPlayArgs extends PanelArgs {
	result: PanelResult;
	series: number;
	listRows: number;
	gaps: Gaps;
	dataState: string;
}

const findPlot = (root: HTMLElement): uPlot | undefined =>
	[...root.querySelectorAll<UPlotHostElement>('div')].find(
		(node) => node.__uplot,
	)?.__uplot;

/** The live uPlot instance, once it has drawn `seriesCount` series. */
export const waitForPlot = async (
	root: HTMLElement,
	seriesCount: number,
): Promise<uPlot> => {
	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(
			plot?.series.slice(1).filter((series) => series.show),
		).toHaveLength(seriesCount);
	}, PANEL_LOAD);

	return plot as uPlot;
};

const toRgb = (color: string): [number, number, number] => {
	const probe = document.createElement('canvas').getContext('2d');
	if (!probe) {
		throw new Error('no 2d context to resolve the colour');
	}
	probe.fillStyle = color;
	probe.fillRect(0, 0, 1, 1);
	const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;

	return [r, g, b];
};

/**
 * Share (0–1) of the plot row at `value` painted in `color`. Threshold lines are
 * drawn straight onto the canvas and leave no state on the instance; the line is
 * 2px, dashed and anti-aliased, so three rows are read and a column counts when
 * any of them is close.
 */
export const lineCoverage = (
	plot: uPlot,
	value: number,
	color: string,
): number => {
	const [r, g, b] = toRgb(color);
	const y = Math.round(plot.valToPos(value, 'y', true));
	const x = Math.round(plot.bbox.left);
	const width = Math.round(plot.bbox.width);
	const { data } = plot.ctx.getImageData(x, y - 1, width, 3);
	let hits = 0;
	for (let column = 0; column < width; column++) {
		for (let row = 0; row < 3; row++) {
			const i = (row * width + column) * 4;
			if (
				data[i + 3] > 0 &&
				Math.abs(data[i] - r) < 60 &&
				Math.abs(data[i + 1] - g) < 60 &&
				Math.abs(data[i + 2] - b) < 60
			) {
				hits += 1;
				break;
			}
		}
	}

	return width > 0 ? hits / width : 0;
};

const plottedMax = (plot: uPlot): number =>
	Math.max(
		...plot.data
			.slice(1)
			.flatMap((values) =>
				(values as (number | null)[]).filter(
					(value): value is number => typeof value === 'number',
				),
			),
	);

const isStacked = ({ kind, stack }: PanelArgs): boolean =>
	(kind === 'Area' || kind === 'Bar') && stack !== StackMode.none;

/** Time Series and Area carry `chartAppearance`; Bar draws with its defaults. */
const hasLineAppearance = ({ kind }: PanelArgs): boolean =>
	kind === 'TimeSeries' || kind === 'Area';

const nullCount = (plot: uPlot): number =>
	plot.data
		.slice(1)
		.reduce(
			(count, values) =>
				count + (values as unknown[]).filter((value) => value === null).length,
			0,
		);

/** Line style, points and gap handling, read off the live series. */
const expectLineAppearance = async (
	plot: uPlot,
	args: PanelPlayArgs,
): Promise<void> => {
	const series = plot.series.slice(1);
	const appearance = hasLineAppearance(args);
	const dashed = appearance && args.lineStyle === LineStyle.dashed;
	const breaks = appearance && args.spanGaps === 'break-10m';

	for (const [index, line] of series.entries()) {
		await expect((line.dash ?? []).length > 0).toBe(dashed);
		if (appearance) {
			// A predicate, built so it can also show the isolated points a gap leaves
			// behind; uPlot only ever calls it with the plot and the series index.
			const show = line.points?.show as
				| boolean
				| ((u: uPlot, seriesIndex: number) => boolean)
				| undefined;
			await expect(typeof show === 'function' ? show(plot, index + 1) : show).toBe(
				args.showPoints,
			);
		}
		// A numeric threshold is applied in data-prep, so uPlot's own bridging is off.
		await expect(line.spanGaps).toBe(!breaks);
	}

	// The break is a null inserted into the gap; bridging leaves none.
	await expect(nullCount(plot) > 0).toBe(breaks && args.gaps === 'hole');
};

const expectLineChart = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const plot = await waitForPlot(root, args.series);

	// Set from options at construction; uPlot's typings leave it off the instance.
	const { bands } = plot as uPlot & { bands?: uPlot.Band[] };
	await expect(bands?.length ?? 0).toBe(isStacked(args) ? args.series - 1 : 0);
	// A percent stack replaces the y scale with its own 0–100 one.
	if (!(args.kind === 'Area' && args.stack === StackMode.percent)) {
		await expect(plot.scales.y.distr).toBe(args.yScale === 'log' ? 3 : 1);
	}
	await expectLineAppearance(plot, args);
	if (args.legend === 'right') {
		await expect(
			await within(root).findByTestId('legend-search-input', {}, PANEL_LOAD),
		).toBeInTheDocument();
	}
	await waitFor(
		() =>
			expect(
				root.querySelectorAll('[data-legend-item-id][aria-checked="true"]'),
			).toHaveLength(args.series),
		PANEL_LOAD,
	);

	if (args.kind === 'Area' && args.stack === StackMode.percent) {
		await expect(plottedMax(plot)).toBeLessThanOrEqual(100.0001);
		await expect(plottedMax(plot)).toBeGreaterThan(99);
	}

	// The draw hook paints after the plot mounts, so the canvas is polled.
	await waitFor(async () => {
		const coverage = lineCoverage(plot, CHART_THRESHOLD_VALUE, THRESHOLD_COLOR);
		if (args.thresholds && args.stack !== StackMode.percent) {
			await expect(coverage).toBeGreaterThan(0.4);
		} else if (!args.thresholds) {
			await expect(coverage).toBeLessThan(0.1);
		}
	}, PANEL_LOAD);
};

const expectHistogram = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const plot = await waitForPlot(root, args.series);

	// Bins of the values, not timestamps: the x scale is in the series' own unit.
	await expect(plot.data[0].length).toBeGreaterThan(1);
	await expect(plot.scales.x.max ?? Infinity).toBeLessThan(1e6);
};

const firstGradientColor = (background: string): string | undefined =>
	background.match(/rgba?\([^)]+\)/)?.[0];

const expectHeatmap = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const bar = await within(root).findByTestId('color-bar', {}, PANEL_LOAD);
	await expect(bar).toHaveTextContent(/count/i);

	const isDark = document.body.classList.contains('darkMode');
	const [lowStop] = getPaletteStops(HEATMAP_PALETTE_MAP[args.palette], isDark);
	const track = bar.querySelector<HTMLElement>('div');
	await expect(firstGradientColor(track?.style.background ?? '')).toBe(
		`rgb(${toRgb(lowStop).join(', ')})`,
	);

	let plot: uPlot | undefined;
	await waitFor(async () => {
		plot = findPlot(root);
		await expect(plot).toBeDefined();
	}, PANEL_LOAD);
	const yMax = plot?.scales.y.max ?? 0;
	// Log and symlog lay rows out on log10 of the bounds; linear on the bounds.
	if (
		args.heatmapScale === HeatmapYScale.log ||
		args.heatmapScale === HeatmapYScale.symlog
	) {
		await expect(yMax).toBeLessThan(10);
	} else {
		await expect(yMax).toBeGreaterThanOrEqual(
			HEATMAP_BUCKETS[HEATMAP_BUCKETS.length - 1],
		);
	}
};

const expectPie = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const chart = await within(root).findByTestId('pie-chart', {}, PANEL_LOAD);
	// The legend's icons are SVGs too; the donut is the first one.
	const donut = chart.querySelector('svg');
	await expect(donut?.querySelectorAll('g > path')).toHaveLength(args.series);
	await expect(
		donut?.querySelector('text[text-anchor="middle"]')?.textContent,
	).toMatch(/\d/);
};

const expectNumber = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const value = await within(root).findByTestId(
		'number-panel-value',
		{},
		PANEL_LOAD,
	);
	await expect(value).toHaveTextContent(String(NUMBER_VALUE));

	const renderer = within(root).getByTestId('number-panel-renderer');
	if (args.unit === 'ms') {
		await expect(renderer).toHaveTextContent('ms');
	}

	const filled = [...renderer.querySelectorAll<HTMLElement>('div')].some(
		(node) => node.style.backgroundColor !== '',
	);
	await expect(filled).toBe(args.thresholds);
};

const expectTable = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const renderer = await within(root).findByTestId(
		'table-panel-renderer',
		{},
		PANEL_LOAD,
	);
	await waitFor(
		() =>
			expect(renderer.querySelectorAll('tbody tr.ant-table-row')).toHaveLength(
				args.series,
			),
		PANEL_LOAD,
	);
	await expect(within(renderer).getByText('service.name')).toBeInTheDocument();

	const [, firstValue] = renderer.querySelectorAll('tbody tr.ant-table-row td');
	// A unit suffixes the cell (`3.8 s`, `3.71 KiB`); without one it is the bare count.
	if (args.columnUnits && args.unit !== 'none') {
		await expect(firstValue).toHaveTextContent(/\d\s?[a-z]+$/i);
	} else {
		await expect(firstValue).toHaveTextContent(/^[\d,.]+$/);
	}

	const filled = [...renderer.querySelectorAll<HTMLElement>('tbody td')].filter(
		(cell) => cell.style.backgroundColor !== '',
	);
	const above = TABLE_VALUES(args.series).filter(
		(value) => value > TABLE_THRESHOLD_VALUE,
	);
	await expect(filled).toHaveLength(args.thresholds ? above.length : 0);
};

export const listRowsOnPage = (listRows: number, page: number): number =>
	Math.max(0, Math.min(LIST_PAGE_SIZE, listRows - page * LIST_PAGE_SIZE));

export const expectListPage = async (
	root: HTMLElement,
	listRows: number,
	page: number,
): Promise<void> => {
	const renderer = await within(root).findByTestId(
		'list-panel-renderer',
		{},
		PANEL_LOAD,
	);
	await waitFor(async () => {
		await expect(
			within(renderer).getByTestId('list-panel-page'),
		).toHaveTextContent(`Page ${page + 1}`);
		// Skeleton rows stand in while the next page loads.
		await expect(
			renderer.querySelectorAll(
				'tbody tr.ant-table-row:not([data-row-key^="skeleton"])',
			),
		).toHaveLength(listRowsOnPage(listRows, page));
	}, PANEL_LOAD);
	await expect(
		renderer.querySelector('tbody tr.ant-table-row'),
	).toHaveTextContent(`log line ${page * LIST_PAGE_SIZE + 1}:`);
	await expect(within(renderer).getByTestId('list-panel-next')).toHaveAttribute(
		'aria-disabled',
		String(listRows <= (page + 1) * LIST_PAGE_SIZE),
	);
};

/** Filters the right legend down to one series by name. */
export const filterLegend = async (
	root: HTMLElement,
	name: string,
): Promise<void> => {
	const search = await within(root).findByTestId(
		'legend-search-input',
		{},
		PANEL_LOAD,
	);
	await userEvent.type(search, name);
	await waitFor(async () => {
		const rows = root.querySelectorAll('[data-legend-item-id]');
		await expect(rows).toHaveLength(1);
		await expect(rows[0]).toHaveTextContent(name);
	}, PANEL_LOAD);
	await expect(within(root).getByTestId('legend-status')).toHaveTextContent(
		/Showing 1 of \d+/,
	);
};

const tableRows = (root: HTMLElement): NodeListOf<Element> =>
	root.querySelectorAll(
		'[data-testid="table-panel-renderer"] tbody tr.ant-table-row',
	);

/** Opens the Table's header search, narrows it to `term`, then clears it. */
export const searchTable = async (
	root: HTMLElement,
	term: string,
	allRows: number,
): Promise<void> => {
	await userEvent.click(
		await within(root).findByTestId(
			'panel-header-search-trigger',
			{},
			PANEL_LOAD,
		),
	);
	await userEvent.type(
		await within(root).findByTestId('panel-header-search-input'),
		term,
	);
	await waitFor(async () => {
		await expect(tableRows(root)).toHaveLength(1);
		await expect(tableRows(root)[0]).toHaveTextContent(term);
	}, PANEL_LOAD);

	await userEvent.click(within(root).getByTestId('panel-header-search-clear'));
	await waitFor(
		async () => expect(tableRows(root)).toHaveLength(allRows),
		PANEL_LOAD,
	);
};

export const nextListPage = async (root: HTMLElement): Promise<void> => {
	await userEvent.click(within(root).getByTestId('list-panel-next'));
};

const TEXT_ALIGN_CSS: Record<string, string> = {
	left: 'left',
	center: 'center',
	right: 'right',
};

const expectText = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const panel = await within(root).findByTestId('text-panel', {}, PANEL_LOAD);
	const body = within(panel);

	if (args.textSample === 'runbook') {
		await expect(
			body.getByRole('heading', { name: 'Checkout runbook' }),
		).toBeInTheDocument();
		await expect(body.getAllByRole('listitem')).toHaveLength(3);
		await expect(
			body.getByRole('link', { name: 'payments dashboard' }),
		).toBeInTheDocument();
		await expect(panel.querySelector('pre code')).toHaveTextContent(
			'kubectl scale',
		);
	} else if (args.textSample === 'note') {
		await expect(panel.querySelector('strong')).toHaveTextContent('checkout');
	} else {
		await expect(body.getByTestId('text-panel-empty')).toBeInTheDocument();
	}

	await expect(getComputedStyle(panel).textAlign).toBe(
		TEXT_ALIGN_CSS[args.textAlign],
	);

	const title = within(root).queryByText(PANEL_NAME.Text);
	if (args.hideHeader) {
		await expect(title).toBeNull();
		await expect(
			within(root).getByTestId('hidden-header-drag-handle'),
		).toBeInTheDocument();
	} else {
		await expect(title).toBeInTheDocument();
	}
};

const expectNoData = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	await within(root).findByTestId(
		args.kind === 'Number' ? 'number-panel-no-data' : 'panel-no-data',
		{},
		PANEL_LOAD,
	);
	await expect(findPlot(root)).toBeUndefined();
};

const KIND_EXPECTATIONS: Record<
	Exclude<PanelPlayArgs['kind'], 'Text'>,
	(root: HTMLElement, args: PanelPlayArgs) => Promise<void>
> = {
	TimeSeries: expectLineChart,
	Bar: expectLineChart,
	Area: expectLineChart,
	Histogram: expectHistogram,
	Heatmap: expectHeatmap,
	Pie: expectPie,
	Number: expectNumber,
	Table: expectTable,
	List: (root, args) => expectListPage(root, args.listRows, 0),
};

/**
 * What the one panel on the page must show for the args it was rendered with.
 * Loading and failed belong to the Data control and are left alone.
 */
export const expectPanel = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	if (args.kind === 'Text') {
		await expectText(root, args);
		return;
	}

	await within(root).findByText(PANEL_NAME[args.kind], {}, PANEL_LOAD);

	const empty =
		args.result === 'empty' ||
		(args.kind === 'List'
			? args.listRows === 0
			: args.kind !== 'Number' && args.series === 0);
	if (empty) {
		await expectNoData(root, args);
		return;
	}

	await KIND_EXPECTATIONS[args.kind](root, args);

	// Checked once the data has drawn, so an absent indicator is not one still on its way.
	if (args.result === 'warning') {
		await expect(
			within(root).getByTestId('panel-status-warning'),
		).toBeInTheDocument();
	} else {
		await expect(
			within(root).queryByTestId('panel-status-warning'),
		).not.toBeInTheDocument();
	}
};
