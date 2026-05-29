import { cleanup, screen, waitFor } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { flushNuqsUrl, renderListAlertRules, resetUrl } from './_helpers';

jest.mock(
	'@signozhq/ui/divider',
	() => ({
		Divider: ({ children }: { children?: React.ReactNode }): JSX.Element => (
			<div>{children}</div>
		),
	}),
	{ virtual: true },
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: jest.fn() })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.setTimeout(20000);

describe('ListAlertRules — permissions', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('VIEWER role hides "New Alert" button and "Actions" column', async () => {
		renderListAlertRules({ role: USER_ROLES.VIEWER });

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		expect(
			screen.queryByTestId('list-alerts-new-alert-button'),
		).not.toBeInTheDocument();

		const headers = Array.from(document.querySelectorAll('th')).map(
			(h) => h.textContent ?? '',
		);
		expect(headers.some((t) => t.includes('Actions'))).toBe(false);
		expect(screen.queryByTestId('alert-actions')).not.toBeInTheDocument();
	});

	it('ADMIN role shows "New Alert" button and "Actions" column', async () => {
		renderListAlertRules({ role: USER_ROLES.ADMIN });

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
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

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
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
