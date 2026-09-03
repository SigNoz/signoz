import { render, screen, userEvent } from 'tests/test-utils';

import LegacyDashboardDialog from './LegacyDashboardDialog';

const mockCopy = jest.fn();
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, (value: string) => void] => [{}, mockCopy],
}));

const mockToastSuccess = jest.fn();
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: (message: string): void => mockToastSuccess(message) },
}));

const mockContactSupport = jest.fn();
jest.mock('container/Integrations/utils', () => ({
	handleContactSupport: (isCloud: boolean): void => mockContactSupport(isCloud),
}));

const mockRetryMigration = jest.fn();
let isMigrating = false;
jest.mock('../../hooks/useRetryMigration', () => ({
	useRetryMigration: (): {
		retryMigration: jest.Mock;
		isMigrating: boolean;
	} => ({ retryMigration: mockRetryMigration, isMigrating }),
}));

const DASHBOARD_ID = '0f9a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c';

describe('LegacyDashboardDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		isMigrating = false;
	});

	const setup = ({ open = true, canEdit = true } = {}): void => {
		render(
			<LegacyDashboardDialog
				open={open}
				dashboardId={DASHBOARD_ID}
				dashboardName="My Legacy Dashboard"
				canEdit={canEdit}
				onClose={jest.fn()}
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
		await userEvent.click(screen.getByTestId('legacy-dashboard-retry-migration'));
		expect(mockRetryMigration).toHaveBeenCalledWith(DASHBOARD_ID);
	});

	it('blocks retry and close while the migration is in flight', () => {
		isMigrating = true;
		setup();
		expect(screen.getByTestId('legacy-dashboard-retry-migration')).toBeDisabled();
		expect(screen.getByTestId('legacy-dashboard-close')).toBeDisabled();
	});

	it('offers only the support path without edit access', () => {
		setup({ canEdit: false });
		expect(
			screen.queryByTestId('legacy-dashboard-retry-migration'),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId('legacy-dashboard-contact-support'),
		).toBeInTheDocument();
	});

	it('renders nothing when closed', () => {
		setup({ open: false });
		expect(screen.queryByTestId('legacy-dashboard-id')).not.toBeInTheDocument();
	});
});
