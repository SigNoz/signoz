import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';

import { renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — search', () => {
	it('filters rows by alertname when typing in the search input', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
		expect(screen.getByText('Memory Warning')).toBeInTheDocument();

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'CPU');

		await waitFor(() => {
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
			expect(screen.queryByText('Memory Warning')).not.toBeInTheDocument();
		});
	});

	it('shows all rows again when search is cleared', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'CPU');

		await waitFor(() =>
			expect(screen.queryByText('Memory Warning')).not.toBeInTheDocument(),
		);

		await user.clear(input);

		await waitFor(() => {
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
			expect(screen.getByText('Memory Warning')).toBeInTheDocument();
			expect(screen.getByText('Disk Slow')).toBeInTheDocument();
		});
	});

	it('matches rows by label value (case-insensitive)', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		// "backend" matches `service: backend` labels on Memory Warning and Network Hiccup.
		await user.type(input, 'backend');

		await waitFor(() => {
			expect(screen.getByText('Memory Warning')).toBeInTheDocument();
			expect(screen.getByText('Network Hiccup')).toBeInTheDocument();
			expect(screen.queryByText('High CPU Usage')).not.toBeInTheDocument();
			expect(screen.queryByText('Disk Slow')).not.toBeInTheDocument();
		});
	});

	it('matches rows by label key', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'staging');

		await waitFor(() => {
			expect(screen.getByText('Disk Slow')).toBeInTheDocument();
			expect(screen.queryByText('High CPU Usage')).not.toBeInTheDocument();
			expect(screen.queryByText('Memory Warning')).not.toBeInTheDocument();
		});
	});

	it('renders the no-results empty state when the search matches nothing', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'zzzzznever-matches-anything');

		await waitFor(() =>
			expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument(),
		);
	});

	it('resets pagination to page 1 when the search changes', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts({ initialRoute: '/?page=2&limit=2' });

		await waitFor(() =>
			expect(screen.getByText('Disk Slow')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'CPU');

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
	});
});
