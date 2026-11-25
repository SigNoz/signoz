import { StackMode } from 'lib/uPlotV2/config/types';
import {
	resolveDistributionBars,
	resolveDistributionXAxis,
} from 'lib/visualization/charts/Distribution/layout';
import { render, screen, userEvent, within } from 'tests/test-utils';
import type uPlot from 'uplot';

import DistributionTooltip from '../DistributionTooltip';

// Virtuoso only renders a window in jsdom; render every row.
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
}));
import type { DistributionTooltipProps } from '../types';

// Buckets ≤ 10, (10, 20], (20, 40], > 40 in slots [0, 1] … [3, 4].
const xAxis = resolveDistributionXAxis([10, 20, 40]);
const counts = [
	[1, 4, 2, 0],
	[0, 6, 1, 1],
];
const layout = resolveDistributionBars({
	xAxis,
	counts,
	stack: StackMode.Normal,
	isLogY: false,
});

/** Pixels are values: the cursor at (1.5, 2) is over the first group in (10, 20]. */
function plotAt(left: number, top: number): uPlot {
	const plot: Partial<uPlot> = {
		cursor: { left, top },
		posToVal: (position: number) => position,
	};
	return plot as uPlot;
}

function renderTooltip(
	uPlotInstance: uPlot,
	overrides: Partial<DistributionTooltipProps> = {},
): void {
	render(
		<DistributionTooltip
			id="panel-1"
			uPlotInstance={uPlotInstance}
			isPinned={false}
			dismiss={jest.fn()}
			xAxis={xAxis}
			layout={layout}
			labels={['{service.name="cart"}', '{service.name="checkout"}']}
			groupLabels={[{ 'service.name': 'cart' }, { 'service.name': 'checkout' }]}
			colors={['#f00', '#0f0']}
			counts={counts}
			otherMembers={[]}
			formatBound={(value): string => `${value} ms`}
			{...overrides}
		/>,
	);
}

/** The second drawn group is Other, summing `ad` and `quote`. */
const withOther: Partial<DistributionTooltipProps> = {
	labels: ['{service.name="cart"}', 'Other'],
	groupLabels: [{ 'service.name': 'cart' }, undefined],
	otherMembers: [
		{
			sourceIndex: 3,
			label: '{service.name="ad"}',
			groupLabels: { 'service.name': 'ad' },
			color: '#00f',
			counts: [0, 4, 1, 0],
		},
		{
			sourceIndex: 5,
			label: '{service.name="quote"}',
			groupLabels: { 'service.name': 'quote' },
			color: '#ff0',
			counts: [0, 2, 0, 1],
		},
	],
};
/** In (10, 20], above cart's 4: over Other. */
const overOther = (): uPlot => plotAt(1.5, 7);

describe('DistributionTooltip', () => {
	const listRows = (): string[] =>
		within(screen.getByTestId('uplot-tooltip-list'))
			.getAllByTestId('uplot-tooltip-item-content')
			.map((row) => row.textContent ?? '');

	it('names the bucket under the cursor and its total', () => {
		renderTooltip(plotAt(1.5, 2));

		expect(screen.getByTestId('distribution-tooltip-range')).toHaveTextContent(
			'10 ms – 20 ms',
		);
		expect(screen.getByTestId('distribution-tooltip-total')).toHaveTextContent(
			'10',
		);
	});

	it('puts the hovered group above the list, which runs largest first', () => {
		renderTooltip(plotAt(1.5, 2));

		expect(screen.getByTestId('distribution-tooltip-active')).toHaveTextContent(
			'cart4',
		);
		expect(listRows()).toStrictEqual(['checkout6', 'cart4']);
	});

	it('renders nothing off the plot', () => {
		renderTooltip(plotAt(-1, -1));

		expect(screen.queryByTestId('distribution-tooltip')).not.toBeInTheDocument();
	});

	it('lists the groups Other sums while Other is hovered', () => {
		renderTooltip(overOther(), withOther);

		expect(screen.getByTestId('distribution-tooltip-active')).toHaveTextContent(
			'Other (2)6',
		);
		expect(listRows()).toStrictEqual(['ad4', 'quote2']);
	});

	it('drills into a group of Other picked from the pinned tooltip', async () => {
		const dismiss = jest.fn() as jest.MockedFunction<
			DistributionTooltipProps['dismiss']
		>;
		const onOtherMemberClick = jest.fn() as jest.MockedFunction<
			NonNullable<DistributionTooltipProps['onOtherMemberClick']>
		>;
		renderTooltip(overOther(), {
			...withOther,
			isPinned: true,
			dismiss,
			onOtherMemberClick,
		});

		expect(
			screen.getByTestId('distribution-tooltip-other-hint'),
		).toHaveTextContent('Click a group to drill down');
		await userEvent
			.setup()
			.click(screen.getAllByTestId('uplot-tooltip-item-button')[1]);

		expect(dismiss).toHaveBeenCalledTimes(1);
		expect(onOtherMemberClick).toHaveBeenCalledWith(5, { x: 0, y: 0 });
	});

	it('asks for a pin before a group of Other can be picked', () => {
		renderTooltip(overOther(), {
			...withOther,
			onOtherMemberClick: jest.fn(),
		});

		expect(
			screen.getByTestId('distribution-tooltip-other-hint'),
		).toHaveTextContent('Pin the tooltip, then click a group to drill down');
		expect(
			screen.queryByTestId('uplot-tooltip-item-button'),
		).not.toBeInTheDocument();
	});
});
