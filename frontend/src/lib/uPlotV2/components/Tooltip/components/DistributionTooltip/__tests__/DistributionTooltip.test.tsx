import { StackMode } from 'lib/uPlotV2/config/types';
import {
	resolveDistributionBars,
	resolveDistributionXAxis,
} from 'lib/visualization/charts/Distribution/layout';
import { computeDistributionPercentiles } from 'lib/visualization/charts/Distribution/percentiles';
import { DistributionXScale } from 'lib/visualization/charts/Distribution/types';
import { render, screen } from 'tests/test-utils';
import type uPlot from 'uplot';

import DistributionTooltip from '../DistributionTooltip';

// Buckets: ≤ 10, (10, 20], (20, 40], > 40, on a linear axis.
const xAxis = resolveDistributionXAxis([10, 20, 40], DistributionXScale.Linear);
const counts = [
	[1, 4, 2, 0],
	[0, 6, 1, 1],
];
const visible = [true, true];
const layout = resolveDistributionBars({
	xAxis,
	counts,
	visible,
	stack: StackMode.Normal,
	isLogY: false,
});

/** Pixels are values: the cursor at (15, 2) is over the first group in (10, 20]. */
function plotAt(left: number, top: number): uPlot {
	return {
		cursor: { left, top },
		posToVal: (position: number) => position,
	} as unknown as uPlot;
}

function renderTooltip(uPlotInstance: uPlot): void {
	render(
		<DistributionTooltip
			uPlotInstance={uPlotInstance}
			isPinned={false}
			dismiss={jest.fn()}
			xAxis={xAxis}
			layout={layout}
			labels={['cart', 'checkout']}
			colors={['#f00', '#0f0']}
			counts={counts}
			visible={visible}
			stack={StackMode.Normal}
			markers={computeDistributionPercentiles({
				xAxis,
				totals: [1, 10, 3, 1],
				percentiles: [50],
			})}
			formatBound={(value): string => `${value} ms`}
		/>,
	);
}

describe('DistributionTooltip', () => {
	it('names the bucket under the cursor and its total', () => {
		renderTooltip(plotAt(15, 2));

		expect(screen.getByTestId('distribution-tooltip-range')).toHaveTextContent(
			'(10 ms, 20 ms]',
		);
		expect(screen.getByTestId('distribution-tooltip-total')).toHaveTextContent(
			'10',
		);
	});

	it('lists each group, the hovered one highlighted', () => {
		renderTooltip(plotAt(15, 2));

		const rows = screen.getAllByTestId('distribution-tooltip-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('cart');
		expect(rows[0]).toHaveAttribute('data-hovered', 'true');
		expect(rows[1]).toHaveAttribute('data-hovered', 'false');
	});

	it('lists the percentile estimates', () => {
		renderTooltip(plotAt(15, 2));

		expect(
			screen.getByTestId('distribution-tooltip-percentiles'),
		).toHaveTextContent('p50~16.5 ms');
	});

	it('renders nothing off the plot', () => {
		renderTooltip(plotAt(-1, -1));

		expect(screen.queryByTestId('distribution-tooltip')).not.toBeInTheDocument();
	});
});
