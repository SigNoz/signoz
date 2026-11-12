import type React from 'react';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { render, screen, userEvent } from 'tests/test-utils';

import Distribution from '../Distribution';
import type { DistributionSeries } from '../types';

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

const BUCKETS = [5, 10, 100, 1000];

const SERIES: DistributionSeries[] = [
	{ label: 'service.name=cart', counts: [3, 40, 12, 1, 0] },
	{ label: 'service.name=checkout', counts: [1, 10, 30, 6, 2] },
];

function renderDistribution(
	props: Partial<React.ComponentProps<typeof Distribution>> = {},
): ReturnType<typeof render> {
	return render(
		<Distribution
			id="panel-1"
			buckets={BUCKETS}
			series={SERIES}
			width={800}
			height={400}
			isDarkMode
			data-testid="distribution"
			{...props}
		/>,
	);
}

describe('Distribution', () => {
	// Legend items count from 1, as uPlot's data series do.
	const CART = 1;
	const CHECKOUT = 2;

	// The selection persists under the panel id, which every case here shares.
	beforeEach(() => localStorage.clear());

	function legendItem(seriesIndex: number): HTMLElement {
		return screen.getByTestId(`legend-item-${seriesIndex}`);
	}

	it('renders the plot container', () => {
		renderDistribution();

		expect(screen.getByTestId('distribution')).toBeInTheDocument();
	});

	it('lists every group in the legend, all shown', () => {
		renderDistribution();

		expect(legendItem(CART)).toHaveAttribute('aria-checked', 'true');
		expect(legendItem(CHECKOUT)).toHaveAttribute('aria-checked', 'true');
	});

	it('isolates a group when its row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderDistribution();

		await user.click(legendItem(CART));

		expect(legendItem(CART)).toHaveAttribute('aria-checked', 'true');
		expect(legendItem(CHECKOUT)).toHaveAttribute('aria-checked', 'false');
	});

	it('hides only that group when its marker is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderDistribution();

		await user.click(screen.getByTestId(`legend-marker-${CHECKOUT}`));

		expect(legendItem(CHECKOUT)).toHaveAttribute('aria-checked', 'false');
		expect(legendItem(CART)).toHaveAttribute('aria-checked', 'true');
	});
	it('sums groups past the stacked cap into Other, with a notice', () => {
		renderDistribution({
			series: Array.from({ length: 12 }, (_, index) => ({
				label: `group-${index}`,
				counts: [index, 1, 1, 0, 0],
			})),
		});

		expect(screen.getByTestId('distribution-other-notice')).toHaveTextContent(
			'Showing top 9 of 12 groups; the rest are summed into Other.',
		);
		// The legend still lists every group, so any can be isolated.
		expect(legendItem(1)).toHaveAttribute('aria-label', 'group-0');
	});

	it('shows no notice when every group fits', () => {
		renderDistribution();

		expect(
			screen.queryByTestId('distribution-other-notice'),
		).not.toBeInTheDocument();
	});
});
