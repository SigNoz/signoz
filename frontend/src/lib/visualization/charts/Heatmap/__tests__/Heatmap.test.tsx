import type React from 'react';
import userEvent from '@testing-library/user-event';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { render, screen } from 'tests/test-utils';
import {
	createHeatmapColorResolver,
	DEFAULT_HEATMAP_COLORS,
	resolveCountDomain,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import { resolveHeatmapGrid } from 'lib/uPlotV2/plugins/HeatmapPlugin/grid';
import {
	HeatmapColorMode,
	HeatmapSeries,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import Heatmap from '../Heatmap';

// The shared Legend virtualises its items; render them all so they are queryable.
jest.mock('react-virtuoso', () => ({
	VirtuosoGrid: ({
		data,
		itemContent,
	}: {
		data: LegendItem[];
		itemContent: (index: number, item: LegendItem) => React.ReactNode;
	}): JSX.Element => (
		<div>
			{data.map((item, index) => (
				<div key={item.seriesIndex}>{itemContent(index, item)}</div>
			))}
		</div>
	),
}));

const BUCKETS = [128, 256, 1024];
const STEP = 60;

/** Two groups whose counts sum to a peak of 1,204 in the combined view. */
const SERIES: HeatmapSeries[] = [
	{
		label: 'service.name=cart',
		points: [
			{ timestamp: 1000, counts: [1, 4, 7, 10] },
			{ timestamp: 1060, counts: [2, null, 8, 11] },
			{ timestamp: 1120, counts: [3, 6, 9, 1200] },
		],
	},
	{
		label: 'service.name=checkout',
		points: [{ timestamp: 1120, counts: [0, 0, 0, 4] }],
	},
];

function renderHeatmap(
	props: Partial<React.ComponentProps<typeof Heatmap>> = {},
): ReturnType<typeof render> {
	return render(
		<Heatmap
			id="panel-1"
			buckets={BUCKETS}
			step={STEP}
			series={SERIES}
			width={800}
			height={400}
			isDarkMode
			data-testid="heatmap"
			{...props}
		/>,
	);
}

describe('Heatmap', () => {
	it('renders the plot container', () => {
		renderHeatmap();

		expect(screen.getByTestId('heatmap')).toBeInTheDocument();
	});

	it('shows the colour bar with the resolved count domain', () => {
		renderHeatmap();

		expect(screen.getByTestId('color-bar')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.getByText('1,204')).toBeInTheDocument();
	});

	it('puts the colour bar against the plot, with the legend after it', () => {
		renderHeatmap();

		const bar = screen.getByTestId('color-bar');
		const legend = screen.getByText('service.name=cart').closest('.legend-item');
		// The bar is the scale key for the grid, so it reads before the controls.
		expect(
			bar.compareDocumentPosition(legend as Node) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('keeps the colour bar inside the chart column, not below the legend', () => {
		renderHeatmap();

		expect(
			screen.getByTestId('color-bar').closest('.chart-layout__content'),
		).not.toBeNull();
	});

	it('hides the colour bar when the visual map is off', () => {
		renderHeatmap({ showVisualMap: false });

		expect(screen.queryByTestId('color-bar')).not.toBeInTheDocument();
	});

	it('labels the colour bar with an explicit clamp instead of the data range', () => {
		renderHeatmap({ colors: { minCount: 5, maxCount: 500 } });

		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('500')).toBeInTheDocument();
	});

	it('falls back to the no-data state when the metric has no buckets', () => {
		renderHeatmap({ buckets: [] });

		expect(screen.getByText('No Data')).toBeInTheDocument();
		expect(screen.queryByTestId('color-bar')).not.toBeInTheDocument();
	});

	it('falls back to the no-data state when no columns came back', () => {
		renderHeatmap({ series: [] });

		expect(screen.getByText('No Data')).toBeInTheDocument();
	});
});

describe('Heatmap group legend', () => {
	const CART = 'service.name=cart';
	const CHECKOUT = 'service.name=checkout';

	function legendItem(label: string): HTMLElement {
		const item = screen.getByText(label).closest('.legend-item');
		if (!item) {
			throw new Error(`no legend item for ${label}`);
		}
		return item as HTMLElement;
	}

	function marker(label: string): HTMLElement {
		const element = legendItem(label).querySelector<HTMLElement>(
			'[data-is-legend-marker]',
		);
		if (!element) {
			throw new Error(`no marker for ${label}`);
		}
		return element;
	}

	it('lists the groups, with no combined-view entry', () => {
		renderHeatmap();

		expect(screen.getByText(CART)).toBeInTheDocument();
		expect(screen.getByText(CHECKOUT)).toBeInTheDocument();
		expect(screen.queryByText(/all groups/i)).not.toBeInTheDocument();
	});

	it('enables every group to begin with', () => {
		renderHeatmap();

		expect(legendItem(CART)).not.toHaveClass('legend-item-off');
		expect(legendItem(CHECKOUT)).not.toHaveClass('legend-item-off');
	});

	it('isolates a group when its label is clicked', async () => {
		renderHeatmap();

		await userEvent.click(screen.getByText(CART));

		expect(legendItem(CART)).not.toHaveClass('legend-item-off');
		expect(legendItem(CHECKOUT)).toHaveClass('legend-item-off');
	});

	it('restores every group when the isolated label is clicked again', async () => {
		renderHeatmap();

		await userEvent.click(screen.getByText(CART));
		await userEvent.click(screen.getByText(CART));

		expect(legendItem(CHECKOUT)).not.toHaveClass('legend-item-off');
	});

	it('excludes just one group when its marker is clicked', async () => {
		renderHeatmap();

		await userEvent.click(marker(CHECKOUT));

		expect(legendItem(CHECKOUT)).toHaveClass('legend-item-off');
		expect(legendItem(CART)).not.toHaveClass('legend-item-off');
	});

	/** The ramp the cells and colour bar are drawn from, for the default options. */
	function activeRamp(): string[] {
		const grid = resolveHeatmapGrid({
			buckets: BUCKETS,
			step: STEP,
			series: SERIES,
		});
		return createHeatmapColorResolver({
			options: DEFAULT_HEATMAP_COLORS,
			domain: resolveCountDomain(DEFAULT_HEATMAP_COLORS, grid.counts),
			isDarkMode: true,
			seriesColor: DEFAULT_HEATMAP_COLORS.fill,
		}).ramp.map((color) => color.toLowerCase());
	}

	it('places each marker where its group sits on the colour bar', () => {
		renderHeatmap();
		const ramp = activeRamp();

		// cart peaks at 1200, checkout at 4, so cart sits further along the ramp.
		// The DOM lowercases hex; the ramp is built uppercase.
		const cart = ramp.indexOf(marker(CART).style.borderColor.toLowerCase());
		const checkout = ramp.indexOf(
			marker(CHECKOUT).style.borderColor.toLowerCase(),
		);

		expect(cart).toBeGreaterThan(-1);
		expect(checkout).toBeGreaterThan(-1);
		expect(cart).toBeGreaterThan(checkout);
	});

	it('gives every marker the solid fill in opacity mode', () => {
		renderHeatmap({
			colors: { mode: HeatmapColorMode.Opacity, fill: '#e5484d' },
		});

		// A partially transparent marker is hard to read against the panel.
		expect(marker(CART).style.borderColor).toBe(
			marker(CHECKOUT).style.borderColor,
		);
		expect(marker(CART).style.borderColor).not.toBe('');
	});

	it('hides the legend when there is only one group to choose from', () => {
		renderHeatmap({ series: [SERIES[0]] });

		expect(screen.queryByText(CART)).not.toBeInTheDocument();
	});

	it('hides the legend when asked', () => {
		renderHeatmap({ showLegend: false });

		expect(screen.queryByText(CART)).not.toBeInTheDocument();
	});
});
