import { server } from 'mocks-server/server';
import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildDashboardDeletePermission,
	buildDashboardReadPermission,
	buildDashboardUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import { useDashboardEditContext } from '../useDashboardEditContext';

const DASHBOARD_ID = 'dash-1';
// The copy lives in the dashboard i18n bundle, which the test env does not load,
// so `t` yields the key — which is the part worth asserting anyway.
const LOCKED_COPY = 'dashboard_locked';

let lockedDashboard = false;

// The hook reads the dashboard from the loaded subtree, which a bare renderHook
// has no root page to establish — stand in for it so these cases stay about the
// permissions and the derivation.
jest.mock('../useDashboardFetchRequired', () => ({
	useDashboardFetchRequired: (): { dashboard: unknown } => ({
		dashboard: { id: DASHBOARD_ID, locked: lockedDashboard },
	}),
}));

function renderGuard(
	locked = false,
): ReturnType<
	typeof renderHook<ReturnType<typeof useDashboardEditContext>, void>
> {
	lockedDashboard = locked;
	return renderHook(() => useDashboardEditContext(), {
		wrapper: AllTheProviders,
	});
}

describe('useDashboardEditContext - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('permission granted', () => {
		it('is editable when unlocked', async () => {
			server.use(setupAuthzAdmin());

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.isEditable).toBe(true));
			expect(result.current.editDisabledTooltip).toBe('');
			expect(result.current.deleteDisabledTooltip).toBe('');
		});

		// An edit-capable user gets the lock: it's the thing they can act on.
		it('reports the lock when locked', async () => {
			server.use(setupAuthzAdmin());

			const { result } = renderGuard(true);

			// Settle on the resolved grant: the in-flight state has canEdit false, so
			// a non-empty reason is not enough to know the check has landed.
			await waitFor(() => expect(result.current.canEditDashboard).toBe(true));
			expect(result.current.isEditable).toBe(false);
			expect(result.current.editDisabledTooltip).toBe(LOCKED_COPY);
			expect(result.current.deleteDisabledTooltip).toBe(LOCKED_COPY);
		});
	});

	describe('permission denied', () => {
		// Access before state: a lock would send them asking for the wrong thing.
		it('reports the permission, not the lock, when both apply', async () => {
			server.use(setupAuthzDenyAll());

			const { result } = renderGuard(true);

			await waitFor(() => expect(result.current.editDisabledTooltip).toBe(''));
			expect(result.current.deleteDisabledTooltip).toBe('');
			expect(result.current.editDisabledTooltip).toBe('');
		});

		it('reports the permission when unlocked', async () => {
			server.use(setupAuthzDenyAll());

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.canEditDashboard).toBe(false));
			expect(result.current.canEditDashboard).toBe(false);
			expect(result.current.editDisabledTooltip).toBe('');
			expect(result.current.deleteDisabledTooltip).toBe('');
		});

		// Authz guide rule 2 — update alone is not enough to offer an edit affordance.
		it('is not editable with update but no read', async () => {
			server.use(setupAuthzAllow(buildDashboardUpdatePermission(DASHBOARD_ID)));

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.canEditDashboard).toBe(false));
			expect(result.current.canEditDashboard).toBe(false);
			expect(result.current.editDisabledTooltip).toBe('');
		});

		// Authz guide rule 3 — delete stands on its own.
		it('keeps delete available without read or update', async () => {
			server.use(setupAuthzAllow(buildDashboardDeletePermission(DASHBOARD_ID)));

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.canDeleteDashboard).toBe(true));
			expect(result.current.deleteDisabledTooltip).toBe('');
			expect(result.current.canEditDashboard).toBe(false);
		});

		it('is editable with read and update together', async () => {
			server.use(
				setupAuthzAllow(
					buildDashboardReadPermission(DASHBOARD_ID),
					buildDashboardUpdatePermission(DASHBOARD_ID),
				),
			);

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.isEditable).toBe(true));
		});
	});
});
