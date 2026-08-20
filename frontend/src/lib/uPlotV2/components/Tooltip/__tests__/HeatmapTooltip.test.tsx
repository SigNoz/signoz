import { resolveHeatmapYAxis } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	HeatmapAxisScale,
	HeatmapSeries,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import { render, RenderResult, screen } from 'tests/test-utils';
import type uPlot from 'uplot';

import HeatmapTooltip from '../HeatmapTooltip';

const BOUNDS = [100, 500, 1000, 2500];
const Y_AXIS = resolveHeatmapYAxis(BOUNDS, HeatmapAxisScale.Log);
const TIMESTAMPS = [1_700_000_000, 1_700_000_300];
const STEP = 300;
const PLOT_SIZE = 500;
const ROW_COUNT = BOUNDS.length + 1;

/** Row 2 is the 500ms–1s bucket the design mock hovers. */
const HOVERED_ROW = 2;

function seriesFor(
	group: string,
	countsAtHoveredRow: [number, number],
): HeatmapSeries {
	return {
		label: `service.name=${group}`,
		labels: [{ key: 'service.name', value: group }],
		points: TIMESTAMPS.map((timestamp, column) => ({
			timestamp,
			counts: Array.from({ length: ROW_COUNT }, (_, row) =>
				row === HOVERED_ROW ? countsAtHoveredRow[column] : row * 10,
			),
		})),
	};
}

const GROUPED: HeatmapSeries[] = [
	seriesFor('checkout', [355, 300]),
	seriesFor('frontend', [86, 80]),
	seriesFor('cart', [14, 10]),
	seriesFor('payments', [0, 0]),
];

/** Grid counts, matching what the renderer would have been handed. */
function gridData(rowTotals: number[]): uPlot.AlignedData {
	return [
		TIMESTAMPS,
		...Array.from({ length: ROW_COUNT }, (_, row) => [
			rowTotals[row] ?? row * 40,
			rowTotals[row] ?? row * 40,
		]),
	] as unknown as uPlot.AlignedData;
}

// Totals chosen to match the mock: 2 / 92 / 455 / 269 / 10 bottom-up.
const ROW_TOTALS = [10, 269, 455, 92, 2];

function createFakePlot(): uPlot {
	const xSpan = TIMESTAMPS[TIMESTAMPS.length - 1] + STEP - TIMESTAMPS[0];
	const ySpan = Y_AXIS.max - Y_AXIS.min;
	// Aim the cursor at the middle of the hovered row, first column.
	const rowMid = (Y_AXIS.edges[HOVERED_ROW] + Y_AXIS.edges[HOVERED_ROW + 1]) / 2;
	const top = PLOT_SIZE * (1 - (rowMid - Y_AXIS.min) / ySpan);

	return {
		data: gridData(ROW_TOTALS),
		cursor: { left: PLOT_SIZE * 0.25, top },
		posToVal: (pos: number, scaleKey: string): number =>
			scaleKey === 'x'
				? TIMESTAMPS[0] + (pos / PLOT_SIZE) * xSpan
				: Y_AXIS.min + ((PLOT_SIZE - pos) / PLOT_SIZE) * ySpan,
	} as unknown as uPlot;
}

function renderTooltip(
	overrides: Partial<React.ComponentProps<typeof HeatmapTooltip>> = {},
): RenderResult {
	return render(
		<HeatmapTooltip
			id="panel-1"
			uPlotInstance={createFakePlot()}
			dataIndexes={[]}
			seriesIndex={null}
			isPinned={false}
			dismiss={jest.fn()}
			viaSync={false}
			yAxis={Y_AXIS}
			step={STEP}
			series={GROUPED}
			visibleGroups={GROUPED.map((entry) => entry.label)}
			groupColor="#fcfdbf"
			yAxisUnit="ms"
			{...overrides}
		/>,
	);
}

describe('HeatmapTooltip — cell identity', () => {
	it('heads with the time span the column covers, not a single instant', () => {
		renderTooltip();

		expect(screen.getByTestId('heatmap-tooltip-range').textContent).toMatch(
			/^\d{2}:\d{2} → \d{2}:\d{2}$/,
		);
	});

	it('names the hovered bucket and its count', () => {
		renderTooltip();

		expect(screen.getByTestId('heatmap-tooltip-bucket')).toHaveTextContent(
			'500 ms – 1 s',
		);
		expect(screen.getByTestId('heatmap-tooltip-count')).toHaveTextContent('455');
	});

	it('marks the surface as pinned so the border picks up the ring', () => {
		renderTooltip({ isPinned: true });

		expect(screen.getByTestId('heatmap-tooltip')).toHaveAttribute(
			'data-pinned',
			'true',
		);
	});

	it('is unpinned by default', () => {
		renderTooltip();

		expect(screen.getByTestId('heatmap-tooltip')).toHaveAttribute(
			'data-pinned',
			'false',
		);
	});

	it('separates the cell identity from the block below it', () => {
		renderTooltip();

		expect(screen.getByTestId('heatmap-tooltip-divider')).toBeInTheDocument();
	});

	it('renders a footer when the panel supplies one', () => {
		renderTooltip({
			renderTooltipFooter: ({ isPinned }): JSX.Element => (
				<div data-testid="footer">{isPinned ? 'pinned' : 'press P'}</div>
			),
		});

		expect(screen.getByTestId('footer')).toHaveTextContent('press P');
	});

	it('tells the footer when the tooltip is pinned', () => {
		renderTooltip({
			isPinned: true,
			renderTooltipFooter: ({ isPinned }): JSX.Element => (
				<div data-testid="footer">{isPinned ? 'pinned' : 'press P'}</div>
			),
		});

		expect(screen.getByTestId('footer')).toHaveTextContent('pinned');
	});

	it('renders nothing when the cursor is off the plot', () => {
		const plot = createFakePlot();
		(plot as { cursor: unknown }).cursor = { left: -10, top: -10 };

		const { container } = renderTooltip({ uPlotInstance: plot });

		expect(container).toBeEmptyDOMElement();
	});
});

describe('HeatmapTooltip — grouped, nothing selected', () => {
	it('breaks the cell down by group instead of showing neighbours', () => {
		renderTooltip();

		expect(
			screen.getByTestId('heatmap-tooltip-contribution'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('heatmap-tooltip-buckets'),
		).not.toBeInTheDocument();
	});

	it('heads the breakdown with the groupBy key', () => {
		renderTooltip();

		expect(screen.getByText('service.name')).toBeInTheDocument();
	});

	it('names each row by value alone and orders by contribution', () => {
		renderTooltip();

		const rows = screen
			.getAllByTestId('heatmap-tooltip-contribution-row')
			.map((row) => row.textContent);

		expect(rows[0]).toContain('checkout');
		expect(rows[0]).toContain('355');
		expect(rows[1]).toContain('frontend');
		expect(rows[2]).toContain('cart');
	});

	it('shows each group"s share of the cell', () => {
		renderTooltip();

		const rows = screen.getAllByTestId('heatmap-tooltip-contribution-row');
		// 355 / 455 = 78%, 86 / 455 = 19%, 14 / 455 = 3.1%
		expect(rows[0]).toHaveTextContent('78%');
		expect(rows[1]).toHaveTextContent('19%');
		expect(rows[2]).toHaveTextContent('3.1%');
	});

	it('still lists a group that contributed nothing', () => {
		renderTooltip();

		const rows = screen.getAllByTestId('heatmap-tooltip-contribution-row');
		expect(rows).toHaveLength(GROUPED.length);
		expect(rows[3]).toHaveTextContent('payments');
		expect(rows[3]).toHaveTextContent('0.0%');
	});

	it('does not name a filter when every group is enabled', () => {
		renderTooltip();

		expect(
			screen.queryByTestId('heatmap-tooltip-filter'),
		).not.toBeInTheDocument();
	});
});

describe('HeatmapTooltip — grouped, one enabled', () => {
	const selected = { visibleGroups: ['service.name=checkout'] };

	it('returns to neighbouring buckets, since contribution is already answered', () => {
		renderTooltip(selected);

		expect(screen.getByTestId('heatmap-tooltip-buckets')).toBeInTheDocument();
		expect(
			screen.queryByTestId('heatmap-tooltip-contribution'),
		).not.toBeInTheDocument();
	});

	it('names the active filter', () => {
		renderTooltip(selected);

		expect(screen.getByTestId('heatmap-tooltip-filter')).toHaveTextContent(
			'service.name = checkout',
		);
	});
});

describe('HeatmapTooltip — no grouping', () => {
	const ungrouped = {
		series: [{ label: '', points: GROUPED[0].points }],
		visibleGroups: [''],
	};

	it('shows neighbouring buckets, highest first', () => {
		renderTooltip(ungrouped);

		const rows = screen
			.getAllByTestId('heatmap-tooltip-bucket-row')
			.map((row) => row.textContent);

		// Two buckets either side of 500ms – 1s, reading down the y axis.
		expect(rows).toHaveLength(5);
		expect(rows[0]).toContain('> 2.5 s');
		expect(rows[2]).toContain('500 ms – 1 s');
		expect(rows[4]).toContain('≤ 100 ms');
	});

	it('marks the hovered bucket among its neighbours', () => {
		renderTooltip(ungrouped);

		const hovered = screen
			.getAllByTestId('heatmap-tooltip-bucket-row')
			.filter((row) => row.dataset.hovered === 'true');

		expect(hovered).toHaveLength(1);
		expect(hovered[0]).toHaveTextContent('500 ms – 1 s');
	});

	it('never breaks down a single series', () => {
		renderTooltip(ungrouped);

		expect(
			screen.queryByTestId('heatmap-tooltip-contribution'),
		).not.toBeInTheDocument();
	});
});
