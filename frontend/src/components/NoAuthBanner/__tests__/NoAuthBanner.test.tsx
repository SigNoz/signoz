import { render, screen } from 'tests/test-utils';

import { NoAuthBanner } from '../NoAuthBanner';

describe('NoAuthBanner', () => {
	it('renders the no-auth message', () => {
		render(<NoAuthBanner />);
		expect(
			screen.getByText(/No-auth mode: authentication is disabled/i),
		).toBeInTheDocument();
	});

	it('renders with the warning test id', () => {
		render(<NoAuthBanner />);
		expect(screen.getByTestId('no-auth-banner')).toBeInTheDocument();
	});
});
