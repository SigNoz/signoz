import { render, screen } from 'tests/test-utils';

import IndexBadge from '../IndexBadge';

describe('IndexBadge', () => {
	it('renders a 1-based label for a 0-based index', () => {
		render(<IndexBadge index={0} />);

		expect(screen.getByText('1')).toBeInTheDocument();
	});

	it('renders the correct label for a later index', () => {
		render(<IndexBadge index={4} />);

		expect(screen.getByText('5')).toBeInTheDocument();
	});
});
