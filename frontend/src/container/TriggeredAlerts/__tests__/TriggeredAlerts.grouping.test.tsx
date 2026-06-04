import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';

import { renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — group by', () => {
	it('renders a flat table when no group-by is selected', async () => {
		renderTriggeredAlerts();
		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
		// No "Group" column header in flat mode.
		expect(screen.queryByText('Group')).not.toBeInTheDocument();
	});

	it('groups by service when "service" is selected', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('triggered-alerts-groupby-combobox'));

		const serviceOption = await screen.findByText('service');
		await user.click(serviceOption);
		await user.keyboard('{Escape}');

		await waitFor(() => expect(screen.getByText('Group')).toBeInTheDocument());

		await waitFor(() => {
			expect(screen.getByText('service:frontend')).toBeInTheDocument();
			expect(screen.getByText('service:backend')).toBeInTheDocument();
			expect(screen.getByText('service:misc')).toBeInTheDocument();
		});
	});

	it('expands and collapses a group row to reveal nested alerts', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('triggered-alerts-groupby-combobox'));
		const serviceOption = await screen.findByText('service');
		await user.click(serviceOption);
		await user.keyboard('{Escape}');

		await waitFor(() =>
			expect(screen.getByText('service:frontend')).toBeInTheDocument(),
		);

		// Nested rows aren't shown yet.
		expect(screen.queryByText('High CPU Usage')).not.toBeInTheDocument();

		// The "frontend" group sits first in the table; its expand toggle is the
		// first `group-expand-toggle` in DOM order. Targeting by testid is safe
		// against design changes that add other buttons to the row.
		const expandToggles = screen.getAllByTestId('group-expand-toggle');
		expect(expandToggles.length).toBeGreaterThan(0);
		const frontendGroupBadge = screen.getByText('service:frontend');
		const frontendRow = frontendGroupBadge.closest('tr');
		expect(frontendRow).not.toBeNull();
		const frontendToggle = (frontendRow as HTMLElement).querySelector(
			'[data-testid="group-expand-toggle"]',
		) as HTMLElement | null;
		expect(frontendToggle).not.toBeNull();

		await user.click(frontendToggle as HTMLElement);

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
		expect(screen.getByText('Disk Slow')).toBeInTheDocument();

		await user.click(frontendToggle as HTMLElement);

		await waitFor(() =>
			expect(screen.queryByText('High CPU Usage')).not.toBeInTheDocument(),
		);
	});
});
