import { screen, waitFor } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — permissions', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('VIEWER role hides "New Alert" button and "Actions" column', async () => {
		renderListAlertRules({ role: USER_ROLES.VIEWER });

		await screen.findByText('High CPU Alert');

		expect(
			screen.queryByTestId('list-alerts-new-alert-button'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /new alert/i }),
		).not.toBeInTheDocument();

		const headers = Array.from(document.querySelectorAll('th')).map(
			(h) => h.textContent ?? '',
		);
		expect(headers.some((t) => t.includes('Actions'))).toBe(false);
		expect(screen.queryByTestId('alert-actions')).not.toBeInTheDocument();
	});

	it('ADMIN role shows "New Alert" button and "Actions" column', async () => {
		renderListAlertRules({ role: USER_ROLES.ADMIN });

		await screen.findByText('High CPU Alert');

		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /new alert/i }),
		).toBeInTheDocument();

		await waitFor(() => {
			const headers = Array.from(document.querySelectorAll('th')).map(
				(h) => h.textContent ?? '',
			);
			expect(headers.some((t) => t.includes('Actions'))).toBe(true);
		});
		expect(screen.getAllByTestId('alert-actions').length).toBeGreaterThan(0);
	});

	it('EDITOR role behaves like ADMIN (New Alert + Actions visible)', async () => {
		renderListAlertRules({ role: USER_ROLES.EDITOR });

		await screen.findByText('High CPU Alert');

		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /new alert/i }),
		).toBeInTheDocument();

		await waitFor(() => {
			const headers = Array.from(document.querySelectorAll('th')).map(
				(h) => h.textContent ?? '',
			);
			expect(headers.some((t) => t.includes('Actions'))).toBe(true);
		});
		expect(screen.getAllByTestId('alert-actions').length).toBeGreaterThan(0);
	});
});
