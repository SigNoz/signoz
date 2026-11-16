import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { cloneDashboardV2 } from 'api/generated/services/dashboard';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import DashboardActions from '../DashboardActions';

const DASHBOARD_ID = 'dash-1';

const dashboard = {
	id: DASHBOARD_ID,
	createdBy: 'someone-else@signoz.io',
	locked: false,
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): unknown => ({
			isEditable: true,
			editChecks: [],
			areOtherPermissionsLoading: false,
			deleteChecks: [],
			isLocked: false,
			canEditDashboard: true,
			canDeleteDashboard: true,
			editDisabledTooltip: '',
			deleteDisabledTooltip: '',
		}),
	}),
);

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const mockConfirmDelete = jest.fn();
jest.mock('../useDeleteDashboardAction', () => ({
	useDeleteDashboardAction: (): unknown => ({
		contextHolder: null,
		confirmDeleteDashboard: mockConfirmDelete,
	}),
}));

jest.mock('api/generated/services/dashboard', () => ({
	...jest.requireActual('api/generated/services/dashboard'),
	cloneDashboardV2: jest.fn(),
}));

interface Handlers {
	onLockToggle: jest.Mock;
	onOpenRename: jest.Mock;
	enter: jest.Mock;
}

function renderActions(isDashboardLocked = false): Handlers {
	const handlers = {
		onLockToggle: jest.fn(),
		onOpenRename: jest.fn(),
		enter: jest.fn(),
	};
	render(
		<DashboardActions
			title="D"
			dashboard={dashboard}
			handle={
				{
					active: false,
					enter: handlers.enter,
					exit: jest.fn(),
					node: { current: null },
				} as never
			}
			isDashboardLocked={isDashboardLocked}
			onAddPanel={jest.fn()}
			onLockToggle={handlers.onLockToggle}
			onOpenRename={handlers.onOpenRename}
		/>,
	);
	return handlers;
}

async function clickRow(testId: string): Promise<void> {
	await userEvent.click(screen.getByRole('button', { name: /Actions/ }));
	const row = await screen.findByTestId(testId);
	await waitFor(() => {
		expect(row).not.toHaveAttribute('data-loading');
		expect(row).not.toHaveAttribute('data-disabled');
	});
	await userEvent.click(row);
}

describe('DashboardActions menu rows', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.clearAllMocks();
		server.resetHandlers();
	});

	it('Rename calls onOpenRename only', async () => {
		const handlers = renderActions();
		await clickRow('dashboard-action-rename');

		expect(handlers.onOpenRename).toHaveBeenCalledTimes(1);
		expect(handlers.onLockToggle).not.toHaveBeenCalled();
		expect(handlers.enter).not.toHaveBeenCalled();
		expect(mockConfirmDelete).not.toHaveBeenCalled();
	});

	it('Clone clones the dashboard and navigates to the copy', async () => {
		(cloneDashboardV2 as jest.Mock).mockResolvedValue({
			data: { id: 'dash-copy' },
		});
		const handlers = renderActions();
		await clickRow('dashboard-action-clone');

		await waitFor(() =>
			expect(cloneDashboardV2).toHaveBeenCalledWith({ id: DASHBOARD_ID }),
		);
		await waitFor(() =>
			expect(mockSafeNavigate).toHaveBeenCalledWith('/dashboard/dash-copy'),
		);
		expect(handlers.onOpenRename).not.toHaveBeenCalled();
	});

	it.each([
		[false, 'Lock dashboard'],
		[true, 'Unlock dashboard'],
	])('locked=%s shows "%s" and calls onLockToggle', async (locked, label) => {
		const handlers = renderActions(locked);
		await clickRow('dashboard-action-lock');

		expect(handlers.onLockToggle).toHaveBeenCalledTimes(1);
		expect(handlers.onOpenRename).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole('button', { name: /Actions/ }));
		await expect(
			screen.findByTestId('dashboard-action-lock'),
		).resolves.toHaveTextContent(label);
	});

	it('Full screen enters full screen', async () => {
		const handlers = renderActions();
		await clickRow('dashboard-action-fullscreen');

		expect(handlers.enter).toHaveBeenCalledTimes(1);
		expect(handlers.onLockToggle).not.toHaveBeenCalled();
	});

	it('New section opens the section title modal', async () => {
		const handlers = renderActions();
		expect(screen.queryByTestId('section-title-cancel')).not.toBeInTheDocument();

		await clickRow('dashboard-action-new-section');

		await expect(
			screen.findByTestId('section-title-cancel'),
		).resolves.toBeInTheDocument();
		expect(handlers.onOpenRename).not.toHaveBeenCalled();
	});

	it('Delete asks for delete confirmation', async () => {
		const handlers = renderActions();
		await clickRow('dashboard-action-delete');

		expect(mockConfirmDelete).toHaveBeenCalledTimes(1);
		expect(handlers.onOpenRename).not.toHaveBeenCalled();
		expect(handlers.onLockToggle).not.toHaveBeenCalled();
	});
});
