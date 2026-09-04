import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { IsAdminPermission } from 'lib/authz/hooks/useAuthZ/legacy';
import {
	buildDashboardDeletePermission,
	buildDashboardReadPermission,
	buildDashboardUpdatePermission,
	DashboardListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import DashboardActions from '../DashboardActions';

const DASHBOARD_ID = 'dash-1';

const dashboard = {
	id: DASHBOARD_ID,
	createdBy: 'someone-else@signoz.io',
	locked: false,
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

// Composition is what's under test here; the derivation has its own suite.
const mockEditContext = {
	isEditable: true,
	isLocked: false,
	canEditDashboard: true,
	canDeleteDashboard: true,
	editDisabledReason: '',
	deleteDisabledReason: '',
};
function setEditContextMock(next: Partial<typeof mockEditContext>): void {
	Object.assign(mockEditContext, {
		isEditable: true,
		isLocked: false,
		canEditDashboard: true,
		canDeleteDashboard: true,
		editDisabledReason: '',
		deleteDisabledReason: '',
		...next,
	});
}
jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): typeof mockEditContext => mockEditContext,
	}),
);

// The dropdown trigger's testId is swallowed by Radix's asChild clone.
function openActionsMenu(): Promise<void> {
	return userEvent.click(screen.getByRole('button', { name: /Actions/ }));
}

function renderActions(): ReturnType<typeof render> {
	return render(
		<DashboardActions
			title="D"
			dashboard={dashboard}
			handle={
				{
					active: false,
					enter: jest.fn(),
					exit: jest.fn(),
					node: { current: null },
				} as never
			}
			isDashboardLocked={false}
			onAddPanel={jest.fn()}
			onLockToggle={jest.fn()}
			onOpenRename={jest.fn()}
		/>,
	);
}

describe('DashboardActions - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('permission denied', () => {
		// These controls used to be removed from the DOM entirely.
		it('keeps the toolbar buttons visible and disabled', async () => {
			server.use(setupAuthzDenyAll());
			setEditContextMock({
				isEditable: false,
				canEditDashboard: false,
				editDisabledReason: 'no permission',
			});

			renderActions();

			await waitFor(() => {
				expect(screen.getByTestId('show-drawer')).toBeDisabled();
			});
			expect(screen.getByTestId('add-panel-header')).toBeDisabled();
			// JSON stays available — it's a read-only inspect.
			expect(screen.getByTestId('edit-json')).toBeEnabled();
		});

		it('keeps the menu items present and disabled', async () => {
			server.use(setupAuthzDenyAll());
			setEditContextMock({
				isEditable: false,
				canEditDashboard: false,
				canDeleteDashboard: false,
				editDisabledReason: 'no permission',
				deleteDisabledReason: 'no permission',
			});

			renderActions();
			await openActionsMenu();

			await expect(screen.findByText('Rename')).resolves.toBeInTheDocument();
			expect(screen.getByText('New section')).toBeInTheDocument();
			expect(screen.getByText('Delete dashboard')).toBeInTheDocument();
			expect(screen.getByText('Clone dashboard')).toBeInTheDocument();
			// Full screen never depended on permission.
			expect(screen.getByText('Full screen')).toBeInTheDocument();
		});
	});

	describe('partial permissions', () => {
		// Delete is independent of read/update (authz guide rule 3).
		it('enables delete for a user who can only delete', async () => {
			server.use(setupAuthzAllow(buildDashboardDeletePermission(DASHBOARD_ID)));
			setEditContextMock({
				isEditable: false,
				canEditDashboard: false,
				editDisabledReason: 'no permission',
			});

			renderActions();

			await waitFor(() => {
				expect(screen.getByTestId('show-drawer')).toBeDisabled();
			});
			await openActionsMenu();
			await expect(
				screen.findByText('Delete dashboard'),
			).resolves.toBeInTheDocument();
		});

		it('disables clone when create is denied but edit is allowed', async () => {
			server.use(
				setupAuthzAllow(
					buildDashboardReadPermission(DASHBOARD_ID),
					buildDashboardUpdatePermission(DASHBOARD_ID),
					DashboardListPermission,
					IsAdminPermission,
				),
			);
			setEditContextMock({});

			renderActions();

			await waitFor(() => {
				expect(screen.getByTestId('show-drawer')).toBeEnabled();
			});
			await openActionsMenu();
			await expect(
				screen.findByText('Clone dashboard'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('permission granted', () => {
		it('enables the toolbar for a full-rights user', async () => {
			server.use(setupAuthzAdmin());
			setEditContextMock({});

			renderActions();

			await waitFor(() => {
				expect(screen.getByTestId('show-drawer')).toBeEnabled();
			});
			expect(screen.getByTestId('add-panel-header')).toBeEnabled();
		});
	});
});
