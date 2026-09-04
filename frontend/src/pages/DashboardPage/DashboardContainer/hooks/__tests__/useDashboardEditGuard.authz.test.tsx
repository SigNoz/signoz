import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
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

import {
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_DELETE_PERMISSION_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';

import { useDashboardEditGuard } from '../useDashboardEditGuard';

const DASHBOARD_ID = 'dash-1';

const dashboard = (locked = false): DashboardtypesGettableDashboardV2DTO =>
	({ id: DASHBOARD_ID, locked }) as DashboardtypesGettableDashboardV2DTO;

function renderGuard(
	locked = false,
): ReturnType<
	typeof renderHook<ReturnType<typeof useDashboardEditGuard>, void>
> {
	return renderHook(() => useDashboardEditGuard(dashboard(locked)), {
		wrapper: AllTheProviders,
	});
}

describe('useDashboardEditGuard - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('permission granted', () => {
		it('is editable when unlocked', async () => {
			server.use(setupAuthzAdmin());

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.isEditable).toBe(true));
			expect(result.current.editDisabledReason).toBe('');
			expect(result.current.deleteDisabledReason).toBe('');
		});

		// Lock wins over permission for an edit-capable user: the lock is the thing
		// they can actually act on.
		it('reports the lock when locked', async () => {
			server.use(setupAuthzAdmin());

			const { result } = renderGuard(true);

			await waitFor(() => expect(result.current.editDisabledReason).not.toBe(''));
			expect(result.current.isEditable).toBe(false);
			expect(result.current.editDisabledReason).toBe(DASHBOARD_LOCKED_REASON);
			expect(result.current.deleteDisabledReason).toBe(DASHBOARD_LOCKED_REASON);
		});
	});

	describe('permission denied', () => {
		it('reports the permission when unlocked', async () => {
			server.use(setupAuthzDenyAll());

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.editDisabledReason).not.toBe(''));
			expect(result.current.canEditDashboard).toBe(false);
			expect(result.current.editDisabledReason).toBe(
				DASHBOARD_NO_EDIT_PERMISSION_REASON,
			);
			expect(result.current.deleteDisabledReason).toBe(
				DASHBOARD_NO_DELETE_PERMISSION_REASON,
			);
		});

		// Authz guide rule 2 — update alone is not enough to offer an edit affordance.
		it('is not editable with update but no read', async () => {
			server.use(setupAuthzAllow(buildDashboardUpdatePermission(DASHBOARD_ID)));

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.editDisabledReason).not.toBe(''));
			expect(result.current.canEditDashboard).toBe(false);
			expect(result.current.editDisabledReason).toBe(
				DASHBOARD_NO_EDIT_PERMISSION_REASON,
			);
		});

		// Authz guide rule 3 — delete stands on its own.
		it('keeps delete available without read or update', async () => {
			server.use(setupAuthzAllow(buildDashboardDeletePermission(DASHBOARD_ID)));

			const { result } = renderGuard();

			await waitFor(() => expect(result.current.canDeleteDashboard).toBe(true));
			expect(result.current.deleteDisabledReason).toBe('');
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
