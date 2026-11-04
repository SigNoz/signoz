import type React from 'react';
import userEvent from '@testing-library/user-event';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import { render, screen } from 'tests/test-utils';

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
	const CART = 'service.name=cart';
	const CHECKOUT = 'service.name=checkout';

	// The selection persists under the panel id, which every case here shares.
	beforeEach(() => localStorage.clear());

	function legendItem(label: string): HTMLElement {
		return screen.getByRole('switch', { name: label });
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

	it('isolates a group when its label is clicked', async () => {
		renderDistribution();

		await userEvent.click(screen.getByText(CART));

		expect(legendItem(CART)).toHaveAttribute('aria-checked', 'true');
		expect(legendItem(CHECKOUT)).toHaveAttribute('aria-checked', 'false');
	});

	it('hides only that group when its marker is clicked', async () => {
		renderDistribution();

		const marker = legendItem(CHECKOUT).querySelector<HTMLElement>(
			'[data-is-legend-marker]',
		);
		if (!marker) {
			throw new Error('no marker for checkout');
		}
		await userEvent.click(marker);

		expect(legendItem(CHECKOUT)).toHaveAttribute('aria-checked', 'false');
		expect(legendItem(CART)).toHaveAttribute('aria-checked', 'true');
	});
});
