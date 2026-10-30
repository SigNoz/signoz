import { render, screen } from 'tests/test-utils';

import OverflowBadges from '../OverflowBadges';

const items = ['alpha', 'beta', 'gamma', 'delta'].map((label) => ({
	key: label,
	label,
}));

describe('OverflowBadges', () => {
	it('shows the first badges inline and the rest behind a +N badge', () => {
		render(<OverflowBadges items={items} />);

		expect(screen.getByText('alpha')).toBeInTheDocument();
		expect(screen.getByText('beta')).toBeInTheDocument();
		expect(screen.queryByText('gamma')).not.toBeInTheDocument();
		expect(screen.getByText('+2')).toBeInTheDocument();
	});

	it('omits the +N badge when every item fits', () => {
		render(<OverflowBadges items={items.slice(0, 2)} />);

		expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
	});
});
