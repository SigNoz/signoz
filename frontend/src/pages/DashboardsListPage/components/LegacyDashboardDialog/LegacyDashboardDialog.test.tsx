import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import LegacyDashboardDialog from './LegacyDashboardDialog';
import type { Mock } from 'vitest';

const mockCopy = vi.fn();
vi.mock('react-use', async () => ({
	...(await vi.importActual('react-use')),
	useCopyToClipboard: (): [unknown, (value: string) => void] => [{}, mockCopy],
}));

const mockToastSuccess = vi.fn();
vi.mock('@signozhq/ui/sonner', () => ({
	toast: { success: (message: string): void => mockToastSuccess(message) },
}));

const mockContactSupport = vi.fn();
vi.mock('container/Integrations/utils', () => ({
	handleContactSupport: (isCloud: boolean): void => mockContactSupport(isCloud),
}));

const mockRetryMigration = vi.fn();
let isMigrating = false;
vi.mock('../../hooks/useRetryMigration', () => ({
	useRetryMigration: (): {
		retryMigration: Mock;
		isMigrating: boolean;
	} => ({ retryMigration: mockRetryMigration, isMigrating }),
}));

const DASHBOARD_ID = '0f9a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c';

describe('LegacyDashboardDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isMigrating = false;
	});

	const setup = ({ open = true } = {}): void => {
		render(
			<LegacyDashboardDialog
				open={open}
				dashboardId={DASHBOARD_ID}
				dashboardName="My Legacy Dashboard"
				onClose={vi.fn()}
			/>,
		);
	};

	it('surfaces the dashboard name and id', () => {
		setup();
		expect(screen.getByText('My Legacy Dashboard')).toBeInTheDocument();
		expect(screen.getByTestId('legacy-dashboard-id')).toHaveTextContent(
			DASHBOARD_ID,
		);
	});

	it('copies the dashboard id and confirms with a toast', async () => {
		setup();
		await userEvent.click(screen.getByTestId('legacy-dashboard-copy-id'));
		expect(mockCopy).toHaveBeenCalledWith(DASHBOARD_ID);
		expect(mockToastSuccess).toHaveBeenCalledWith('Dashboard ID copied');
	});

	it('routes the user to support', async () => {
		setup();
		await userEvent.click(screen.getByTestId('legacy-dashboard-contact-support'));
		expect(mockContactSupport).toHaveBeenCalledTimes(1);
	});

	it('retries the migration for the dashboard', async () => {
		setup();
		// Retry is gated on dashboard:update, so it starts disabled until the check
		// resolves.
		await waitFor(() =>
			expect(screen.getByTestId('legacy-dashboard-retry-migration')).toBeEnabled(),
		);
		await userEvent.click(screen.getByTestId('legacy-dashboard-retry-migration'));
		expect(mockRetryMigration).toHaveBeenCalledWith(DASHBOARD_ID);
	});

	it('blocks retry and close while the migration is in flight', () => {
		isMigrating = true;
		setup();
		expect(screen.getByTestId('legacy-dashboard-retry-migration')).toBeDisabled();
		expect(screen.getByTestId('legacy-dashboard-close')).toBeDisabled();
	});

	it('keeps the support path available', () => {
		setup();
		expect(
			screen.getByTestId('legacy-dashboard-contact-support'),
		).toBeInTheDocument();
	});

	it('renders nothing when closed', () => {
		setup({ open: false });
		expect(screen.queryByTestId('legacy-dashboard-id')).not.toBeInTheDocument();
	});
});
