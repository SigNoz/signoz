import { render, screen } from 'tests/test-utils';

import { NoAuthBanner } from '../NoAuthBanner';

describe('NoAuthBanner', () => {
	it('renders the no-auth message', () => {
		render(<NoAuthBanner />);
		expect(
			screen.getByText(/Impersonation mode: authentication is disabled/i),
		).toBeInTheDocument();
	});

	it('renders with the warning test id', () => {
		render(<NoAuthBanner />);
		expect(screen.getByTestId('no-auth-banner')).toBeInTheDocument();
	});

	it('renders a docs link that opens in a new tab', () => {
		render(<NoAuthBanner />);
		const link = screen.getByRole('link', { name: /learn more/i });
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noreferrer');
	});
});
