import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { LegendItem } from 'lib/uPlotV2/config/types';

import { PieChartProps, PieSlice } from 'lib/visualization/charts/types';
import Pie from 'lib/visualization/charts/Pie/Pie';
import { userEvent } from 'tests/test-utils';

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: jest.fn().mockReturnValue({ width: 400, height: 300 }),
}));

jest.mock('components/Graph/yAxisConfig', () => ({
	getYAxisFormattedValue: jest.fn((value: string) => value),
}));

let mockLegendRenders = 0;

// Virtuoso only renders a window in jsdom; render every item so we can
// assert on legend entries and tooltip rows.
jest.mock('react-virtuoso', () => ({
	Virtuoso: ({
		data,
		itemContent,
		'data-testid': testId,
	}: {
		data: unknown[];
		itemContent: (index: number, item: unknown) => React.ReactNode;
		'data-testid'?: string;
	}): JSX.Element => (
		<div data-testid={testId}>
			{data.map((item, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<div key={index}>{itemContent(index, item)}</div>
			))}
		</div>
	),
	VirtuosoGrid: ({
		data,
		itemContent,
	}: {
		data: LegendItem[];
		itemContent: (index: number, item: LegendItem) => React.ReactNode;
	}): JSX.Element => {
		mockLegendRenders += 1;
		return (
			<div data-testid="virtuoso-grid">
				{data.map((item, index) => (
					<div key={item.seriesIndex ?? index}>{itemContent(index, item)}</div>
				))}
			</div>
		);
	},
}));

const DATA: PieSlice[] = [
	{ label: 'frontend', value: 100, color: '#aa0000' },
	{ label: 'cart', value: 60, color: '#00aa00' },
	{ label: 'checkout', value: 40, color: '#0000aa' },
];

function renderPie(
	props: Partial<React.ComponentProps<typeof Pie>> = {},
): ReturnType<typeof render> {
	return render(
		<Pie data={DATA} isDarkMode={false} data-testid="pie" {...props} />,
	);
}

const mockSliceClick = (): jest.MockedFunction<
	NonNullable<PieChartProps['onSliceClick']>
> => jest.fn();

describe('Pie', () => {
	it('renders the "No data" state for empty data', () => {
		render(<Pie data={[]} isDarkMode={false} data-testid="pie" />);
		expect(screen.getByText('No data')).toBeInTheDocument();
	});

	it('renders one arc per slice plus the legend entries and centre total', () => {
		renderPie();

		const svg = screen.getByTestId('pie').querySelector('svg') as SVGElement;
		expect(svg.querySelectorAll('path')).toHaveLength(DATA.length);

		const legend = screen.getByTestId('virtuoso-grid');
		expect(within(legend).getByText('frontend')).toBeInTheDocument();
		expect(within(legend).getByText('cart')).toBeInTheDocument();
		expect(within(legend).getByText('checkout')).toBeInTheDocument();

		// Centre total = 100 + 60 + 40 (formatter mocked to echo the value).
		expect(screen.getByText('200')).toBeInTheDocument();
	});

	it('lays the legend out in a row for the right position and a column for bottom', () => {
		const { rerender } = render(
			<Pie
				data={DATA}
				isDarkMode={false}
				position={LegendPosition.RIGHT}
				data-testid="pie"
			/>,
		);
		expect(screen.getByTestId('pie')).toHaveStyle({ flexDirection: 'row' });

		rerender(
			<Pie
				data={DATA}
				isDarkMode={false}
				position={LegendPosition.BOTTOM}
				data-testid="pie"
			/>,
		);
		expect(screen.getByTestId('pie')).toHaveStyle({ flexDirection: 'column' });
	});

	it('isolates a slice when its legend row is clicked with everything showing', () => {
		renderPie();
		const svg = screen.getByTestId('pie').querySelector('svg') as SVGElement;
		expect(svg.querySelectorAll('path')).toHaveLength(3);

		fireEvent.click(screen.getByTestId('legend-item-1'));

		// Nothing visible to exclude, so the click isolates: one arc left.
		expect(svg.querySelectorAll('path')).toHaveLength(1);
	});

	it('recomputes the centre total from the slices left showing', () => {
		renderPie();
		// The arcs carry leader labels of their own, so read the centre text.
		const centreTotal = (): string | null =>
			screen.getByTestId('pie').querySelector('text > tspan')?.textContent ?? null;
		expect(centreTotal()).toBe('200');

		fireEvent.click(screen.getByTestId('legend-item-0'));

		expect(centreTotal()).toBe('100');
	});

	it('excludes a slice when its legend row is clicked with others already hidden', () => {
		renderPie();
		const svg = screen.getByTestId('pie').querySelector('svg') as SVGElement;

		// Isolate, then add a second slice back, so nothing is isolated any more.
		fireEvent.click(screen.getByTestId('legend-item-1'));
		fireEvent.click(screen.getByTestId('legend-item-0'));
		expect(svg.querySelectorAll('path')).toHaveLength(2);

		fireEvent.click(screen.getByTestId('legend-item-0'));

		// One slice hidden → one fewer arc drawn.
		expect(svg.querySelectorAll('path')).toHaveLength(1);
	});

	it('hints at drill-down on a plain slice only when clickable', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { unmount } = renderPie({ onSliceClick: mockSliceClick() });
		const arc = (): Element =>
			screen.getByTestId('pie').querySelectorAll('svg g g')[0];
		await user.hover(arc());
		expect(screen.getByText('Click to drilldown')).toBeInTheDocument();
		unmount();

		renderPie();
		await user.hover(arc());
		expect(screen.queryByTestId('pie-tooltip-footer')).toBeNull();
	});

	it('does not re-render the legend while the tooltip follows the cursor', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderPie();
		const arc = screen.getByTestId('pie').querySelectorAll('svg g g')[0];
		await user.hover(arc);
		const rendersAfterEnter = mockLegendRenders;

		// user-event leaves clientX/Y at 0 in jsdom, so cursor moves go through fireEvent.
		fireEvent.mouseMove(arc, { clientX: 20, clientY: 20 });
		fireEvent.mouseMove(arc, { clientX: 30, clientY: 30 });

		expect(mockLegendRenders).toBe(rendersAfterEnter);
	});

	describe('grouped slice', () => {
		// Each member is under 1% of the 2078 total, so the 12 fold into Other.
		const members: PieSlice[] = Array.from({ length: 12 }, (_, index) => ({
			label: `svc-${index}`,
			value: 12 - index,
			color: '#123456',
		}));
		const GROUPED: PieSlice[] = [
			{ label: 'frontend', value: 1000, color: '#aa0000' },
			{ label: 'cart', value: 600, color: '#00aa00' },
			{ label: 'checkout', value: 400, color: '#0000aa' },
			...members,
		];
		const arcs = (testId = 'pie'): NodeListOf<SVGPathElement> =>
			(
				screen.getByTestId(testId).querySelector('svg') as SVGElement
			).querySelectorAll('path');
		const arcGroups = (testId = 'pie'): NodeListOf<SVGGElement> =>
			(
				screen.getByTestId(testId).querySelector('svg') as SVGElement
			).querySelectorAll('g g');
		const tooltipList = (): HTMLElement =>
			screen.getByTestId('uplot-tooltip-list');
		const tooltip = (): HTMLElement =>
			document.querySelector('[data-pie-tooltip]') as HTMLElement;

		let user: ReturnType<typeof userEvent.setup>;
		beforeEach(() => {
			user = userEvent.setup({ pointerEventsCheck: 0 });
		});

		const hoverOther = async (testId = 'pie'): Promise<SVGGElement> => {
			const otherArc = arcGroups(testId)[3];
			await user.hover(otherArc);
			return otherArc;
		};

		it('draws one Other arc but lists every series in the legend', () => {
			renderPie({ data: GROUPED });

			expect(arcs()).toHaveLength(4);
			expect(screen.getByText('Other (12)')).toBeInTheDocument();
			const legend = screen.getByTestId('virtuoso-grid');
			expect(within(legend).getByText('svc-11')).toBeInTheDocument();
			expect(within(legend).queryByText(/^Other/)).toBeNull();
		});

		it('highlights the Other arc when a series inside it is hovered in the legend', async () => {
			renderPie({ data: GROUPED });

			await user.hover(screen.getByTestId('legend-item-5'));

			const fills = [...arcs()].map((arc) => arc.getAttribute('fill'));
			expect(fills[0]).toBe('rgba(170, 0, 0, 0.4)');
			expect(fills[3]).not.toMatch(/^rgba/);
		});

		it('highlights a real series named Other, not the grouped slice', async () => {
			renderPie({
				data: [
					...GROUPED.slice(0, 3),
					{ label: 'Other', value: 500, color: '#00aaaa' },
					...members,
				],
			});

			await user.hover(screen.getByTestId('legend-item-3'));

			const fills = [...arcs()].map((arc) => arc.getAttribute('fill'));
			expect(fills[3]).toBe('#00aaaa');
			expect(fills[fills.length - 1]).toMatch(/^rgba/);
		});

		it('regroups Other from the series left showing', async () => {
			renderPie({ data: GROUPED });

			// Isolate one member, then add a second back: Other can't hold just one.
			await user.click(screen.getByTestId('legend-item-3'));
			expect(arcs()).toHaveLength(1);
			await user.click(screen.getByTestId('legend-item-0'));
			await user.click(screen.getByTestId('legend-item-4'));

			expect(arcs()).toHaveLength(3);
			expect(screen.queryByText(/^Other/)).toBeNull();
		});

		it('lists every member in the hover tooltip, not yet clickable', async () => {
			renderPie({ data: GROUPED, onSliceClick: mockSliceClick() });

			await hoverOther();

			expect(tooltipList().children).toHaveLength(12);
			expect(within(tooltipList()).getByText('svc-11')).toBeInTheDocument();
			expect(
				screen.getByText('Click to pin, then pick a series'),
			).toBeInTheDocument();
			expect(screen.queryByTestId('uplot-tooltip-item-button')).toBeNull();
			expect(screen.queryByTestId('uplot-tooltip-status')).toBeNull();
		});

		it('follows the cursor until pinned', async () => {
			renderPie({ data: GROUPED, onSliceClick: mockSliceClick() });
			const otherArc = await hoverOther();

			// user-event leaves clientX/Y at 0 in jsdom, so cursor moves go through fireEvent.
			fireEvent.mouseMove(otherArc, { clientX: 100, clientY: 50 });
			const first = tooltip().getAttribute('style');
			fireEvent.mouseMove(otherArc, { clientX: 140, clientY: 90 });
			const moved = tooltip().getAttribute('style');
			expect(moved).not.toBe(first);

			await user.click(otherArc);
			fireEvent.mouseMove(otherArc, { clientX: 10, clientY: 10 });
			expect(tooltip().getAttribute('style')).toBe(moved);
		});

		it('pins on click, then drills into the clicked member', async () => {
			const onSliceClick = mockSliceClick();
			renderPie({ data: GROUPED, onSliceClick });

			const otherArc = await hoverOther();
			await user.click(otherArc);
			await user.unhover(otherArc);

			expect(onSliceClick).not.toHaveBeenCalled();
			expect(screen.getByTestId('uplot-tooltip-status')).toBeInTheDocument();
			expect(screen.getByText('12 series')).toBeInTheDocument();
			expect(screen.getByText('Click a series to drilldown')).toBeInTheDocument();

			jest
				.spyOn(tooltip(), 'getBoundingClientRect')
				.mockReturnValue({ left: 40, top: 70 } as DOMRect);
			await user.click(within(tooltipList()).getByText('svc-3'));

			// The drill-down menu opens where the pinned tooltip was, not at the row.
			expect(onSliceClick).toHaveBeenCalledWith(members[3], { x: 40, y: 70 });
			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();
		});

		it('unpins on Escape, a click outside and the Unpin button', async () => {
			renderPie({ data: GROUPED, onSliceClick: mockSliceClick() });

			await user.click(await hoverOther());
			await user.keyboard('{Escape}');
			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();

			await user.click(await hoverOther());
			await user.click(document.body);
			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();

			await user.click(await hoverOther());
			await user.click(screen.getByTestId('pie-tooltip-unpin'));
			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();
		});

		it('unpins when a click lands on another pie', async () => {
			render(
				<>
					<Pie data={GROUPED} isDarkMode={false} data-testid="pie" />
					<Pie data={DATA} isDarkMode={false} data-testid="other-pie" />
				</>,
			);

			await user.click(await hoverOther());
			expect(tooltipList()).toBeInTheDocument();

			await user.click(arcGroups('other-pie')[0]);

			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();
		});

		it('drops the pinned tooltip when new data arrives', async () => {
			const { rerender } = renderPie({ data: GROUPED });

			await user.click(await hoverOther());
			expect(tooltipList()).toBeInTheDocument();

			rerender(<Pie data={[...GROUPED]} isDarkMode={false} data-testid="pie" />);

			expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();
		});

		it('pins without drill-down targets when drill-down is off', async () => {
			renderPie({ data: GROUPED });

			await user.click(await hoverOther());

			expect(screen.queryByTestId('uplot-tooltip-item-button')).toBeNull();
			expect(screen.getByTestId('pie-tooltip-unpin')).toBeInTheDocument();
		});
	});
});
