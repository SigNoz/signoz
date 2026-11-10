import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';

import { renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — severity filter', () => {
	it('filters to only critical-severity rows when "Critical" is selected', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('triggered-alerts-filter-combobox'));

		const criticalOption = await screen.findByText(
			'Critical (severity:critical)',
		);
		await user.click(criticalOption);

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
			expect(screen.queryByText('Memory Warning')).not.toBeInTheDocument();
			expect(screen.queryByText('Disk Slow')).not.toBeInTheDocument();
			expect(screen.queryByText('Network Hiccup')).not.toBeInTheDocument();
		});
	});

	it('shows union when multiple severities are selected', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('triggered-alerts-filter-combobox'));
		const critical = await screen.findByText('Critical (severity:critical)');
		await user.click(critical);

		const warning = await screen.findByText('Warning (severity:warning)');
		await user.click(warning);

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
			expect(screen.getByText('Memory Warning')).toBeInTheDocument();
			expect(screen.queryByText('Disk Slow')).not.toBeInTheDocument();
			expect(screen.queryByText('Network Hiccup')).not.toBeInTheDocument();
		});
	});

	it('clearing the filter shows all rows again', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('triggered-alerts-filter-combobox'));
		const critical = await screen.findByText('Critical (severity:critical)');
		await user.click(critical);
		await user.keyboard('{Escape}');

		await waitFor(() =>
			expect(screen.queryByText('Memory Warning')).not.toBeInTheDocument(),
		);

		// Reopen the filter combobox and deselect Critical (clicking again toggles).
		await user.click(screen.getByTestId('triggered-alerts-filter-combobox'));
		const criticalAgain = await screen.findByText('Critical (severity:critical)');
		await user.click(criticalAgain);
		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
			expect(screen.getByText('Memory Warning')).toBeInTheDocument();
			expect(screen.getByText('Disk Slow')).toBeInTheDocument();
			expect(screen.getByText('Network Hiccup')).toBeInTheDocument();
		});
	});
});
