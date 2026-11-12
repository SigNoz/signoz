import { StackMode } from 'lib/uPlotV2/config/types';
import {
	resolveDistributionBars,
	resolveDistributionXAxis,
} from 'lib/visualization/charts/Distribution/layout';
import { render, screen } from 'tests/test-utils';
import type uPlot from 'uplot';

import DistributionTooltip from '../DistributionTooltip';

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

function renderTooltip(uPlotInstance: uPlot): void {
	render(
		<DistributionTooltip
			uPlotInstance={uPlotInstance}
			isPinned={false}
			dismiss={jest.fn()}
			xAxis={xAxis}
			layout={layout}
			labels={['{service.name="cart"}', '{service.name="checkout"}']}
			colors={['#f00', '#0f0']}
			counts={counts}
			formatBound={(value): string => `${value} ms`}
		/>,
	);
}

describe('DistributionTooltip', () => {
	it('names the bucket under the cursor and its total', () => {
		renderTooltip(plotAt(1.5, 2));

		expect(screen.getByTestId('distribution-tooltip-range')).toHaveTextContent(
			'10 ms – 20 ms',
		);
		expect(screen.getByTestId('distribution-tooltip-total')).toHaveTextContent(
			'10',
		);
	});

	it('heads the columns with the group-by key and the bucket bound', () => {
		renderTooltip(plotAt(1.5, 2));

		expect(screen.getByText('service.name')).toBeInTheDocument();
		expect(
			screen.getByTestId('distribution-tooltip-cumulative-heading'),
		).toHaveTextContent('≤ 20 ms');
	});

	it('lists every group in legend order, the hovered one active', () => {
		renderTooltip(plotAt(1.5, 2));

		const rows = screen.getAllByTestId('distribution-tooltip-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('cart457%71%');
		expect(rows[0]).toHaveAttribute('data-is-active', 'true');
		expect(rows[1]).toHaveTextContent('checkout675%75%');
		expect(rows[1]).toHaveAttribute('data-is-active', 'false');
	});

	it('renders nothing off the plot', () => {
		renderTooltip(plotAt(-1, -1));

		expect(screen.queryByTestId('distribution-tooltip')).not.toBeInTheDocument();
	});
});
