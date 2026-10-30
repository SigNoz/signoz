import { render, screen } from 'tests/test-utils';

import OverflowBadges from '../OverflowBadges';
import { computeOverflowBadgesLayout } from '../utils';

const items = ['alpha', 'beta', 'gamma', 'delta'].map((label) => ({
	key: label,
	label,
}));

describe('computeOverflowBadgesLayout', () => {
	it('fits as many badges as the width allows, keeping room for +N', () => {
		// 50 + 4 + 50 + 4 + 30 (+N) = 138 fits; a third badge would not.
		expect(
			computeOverflowBadgesLayout(140, 4, [50, 50, 50, 50], 30),
		).toStrictEqual({ visibleCount: 2 });
	});

	it('shows every badge without +N when all fit', () => {
		expect(computeOverflowBadgesLayout(200, 4, [50, 50, 50], 30)).toStrictEqual({
			visibleCount: 3,
		});
	});

	it('truncates the first badge when even it does not fit', () => {
		expect(computeOverflowBadgesLayout(100, 4, [300, 50], 30)).toStrictEqual({
			visibleCount: 1,
			firstMaxWidth: 66,
		});
	});

	it('gives a lone too-wide badge the full width', () => {
		expect(computeOverflowBadgesLayout(100, 4, [300], 30)).toStrictEqual({
			visibleCount: 1,
			firstMaxWidth: 100,
		});
	});
});

describe('OverflowBadges', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('collapses the badges that do not fit into +N', () => {
		jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(160);
		jest
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ width: 50 } as DOMRect);

		render(<OverflowBadges items={items} />);

		expect(screen.getAllByTestId('overflow-badges-item')).toHaveLength(2);
		expect(screen.getByTestId('overflow-badges-more')).toHaveTextContent('+2');
	});

	it('omits +N when every badge fits', () => {
		jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
		jest
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ width: 50 } as DOMRect);

		render(<OverflowBadges items={items} />);

		expect(screen.getAllByTestId('overflow-badges-item')).toHaveLength(4);
		expect(screen.queryByTestId('overflow-badges-more')).not.toBeInTheDocument();
	});
});
