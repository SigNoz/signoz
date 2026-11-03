import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import type { DashboardListItem } from '../../utils/helpers';

import DashboardRow from './DashboardRow';

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const mockSetCopy = jest.fn();
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [{}, mockSetCopy],
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const dashboard = {
	id: 'dash-1',
	legacy: false,
	pinned: false,
	locked: false,
	image: '',
	createdBy: 'alice@signoz.io',
	updatedBy: 'alice@signoz.io',
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-02T00:00:00Z',
	tags: [{ key: 'team', value: 'infra' }],
	spec: { display: { name: 'My Dashboard' } },
} as unknown as DashboardListItem;

async function clickRow(testId: string): Promise<void> {
	render(
		<DashboardRow
			dashboard={dashboard}
			index={0}
			showUpdatedAt={false}
			showUpdatedBy={false}
		/>,
	);
	await userEvent.click(screen.getByTestId('dashboard-action-icon'));
	const row = await screen.findByTestId(testId);
	await waitFor(() => {
		expect(row).not.toHaveAttribute('data-loading');
		expect(row).not.toHaveAttribute('data-disabled');
	});
	await userEvent.click(row);
}

describe('DashboardRow actions menu', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.clearAllMocks();
		server.resetHandlers();
	});

	it('Rename opens the rename modal without navigating', async () => {
		await clickRow('dashboard-action-rename');

		await expect(
			screen.findByTestId('rename-dashboard-input'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('edit-dashboard-tags')).not.toBeInTheDocument();
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('Edit Tags opens the tags modal without navigating', async () => {
		await clickRow('dashboard-action-edit-tags');

		await expect(
			screen.findByTestId('edit-dashboard-tags'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByTestId('rename-dashboard-input'),
		).not.toBeInTheDocument();
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('Copy Link copies the absolute dashboard URL without navigating', async () => {
		await clickRow('dashboard-action-copy-link');

		expect(mockSetCopy).toHaveBeenCalledTimes(1);
		expect(mockSetCopy.mock.calls[0][0]).toMatch(/\/dashboard\/dash-1$/);
		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(
			screen.queryByTestId('rename-dashboard-input'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('edit-dashboard-tags')).not.toBeInTheDocument();
	});
});
