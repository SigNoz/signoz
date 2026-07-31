import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PublicAutoRefresh from '../PublicAutoRefresh';

const props = {
	enabled: false,
	interval: '30s',
	onToggle: jest.fn(),
	onIntervalChange: jest.fn(),
	onRefresh: jest.fn(),
};

describe('PublicAutoRefresh', () => {
	beforeEach(() => jest.clearAllMocks());

	it('renders the refresh and auto-refresh controls', () => {
		render(<PublicAutoRefresh {...props} />);
		expect(screen.getByTestId('public-dashboard-refresh')).toBeInTheDocument();
		expect(
			screen.getByTestId('public-dashboard-auto-refresh'),
		).toBeInTheDocument();
	});

	it('calls onRefresh when the refresh button is clicked', async () => {
		render(<PublicAutoRefresh {...props} />);
		await userEvent.click(screen.getByTestId('public-dashboard-refresh'));
		expect(props.onRefresh).toHaveBeenCalledTimes(1);
	});

	it('changes the interval from the menu', async () => {
		render(<PublicAutoRefresh {...props} />);
		await userEvent.click(screen.getByTestId('public-dashboard-auto-refresh'));
		await userEvent.click(await screen.findByText('5 seconds'));
		expect(props.onIntervalChange).toHaveBeenCalledWith('5s');
	});

	it('toggles auto-refresh from the menu', async () => {
		render(<PublicAutoRefresh {...props} />);
		await userEvent.click(screen.getByTestId('public-dashboard-auto-refresh'));
		await userEvent.click(await screen.findByRole('checkbox'));
		expect(props.onToggle).toHaveBeenCalledWith(true);
	});
});
