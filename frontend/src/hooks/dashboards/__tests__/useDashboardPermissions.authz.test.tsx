import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest } from 'msw';
import { server } from 'mocks-server/server';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildDashboardReadPermission,
	buildDashboardUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import { useDashboardPermissions } from '../useDashboardPermissions';

const DASHBOARD_ID = 'dash-1';

describe('useDashboardPermissions - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('permission granted', () => {
		it('resolves every verb when all are granted', async () => {
			server.use(setupAuthzAdmin());

			const { result } = renderHook(() => useDashboardPermissions(DASHBOARD_ID), {
				wrapper: AllTheProviders,
			});

			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.canRead).toBe(true);
			expect(result.current.canUpdate).toBe(true);
			expect(result.current.canDelete).toBe(true);
			expect(result.current.canEdit).toBe(true);
		});
	});

	describe('permission denied', () => {
		it('resolves every verb as false when all are denied', async () => {
			server.use(setupAuthzDenyAll());

			const { result } = renderHook(() => useDashboardPermissions(DASHBOARD_ID), {
				wrapper: AllTheProviders,
			});

			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.canRead).toBe(false);
			expect(result.current.canUpdate).toBe(false);
			expect(result.current.canDelete).toBe(false);
			expect(result.current.canEdit).toBe(false);
		});
	});

	describe('partial', () => {
		// Authz guide rule 2: an edit affordance needs read as well as update.
		it('denies canEdit when update is granted but read is not', async () => {
			server.use(setupAuthzAllow(buildDashboardUpdatePermission(DASHBOARD_ID)));

			const { result } = renderHook(() => useDashboardPermissions(DASHBOARD_ID), {
				wrapper: AllTheProviders,
			});

			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.canUpdate).toBe(true);
			expect(result.current.canRead).toBe(false);
			expect(result.current.canEdit).toBe(false);
		});

		it('denies canEdit when read is granted but update is not', async () => {
			server.use(setupAuthzAllow(buildDashboardReadPermission(DASHBOARD_ID)));

			const { result } = renderHook(() => useDashboardPermissions(DASHBOARD_ID), {
				wrapper: AllTheProviders,
			});

			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.canRead).toBe(true);
			expect(result.current.canUpdate).toBe(false);
			expect(result.current.canEdit).toBe(false);
		});
	});

	describe('check failure', () => {
		// An authz outage must not read as a denial — callers fall open and let the
		// API decide, matching AuthZGuard's onFailRenderContent default.
		it('reports hasError and grants nothing when the check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);

			const { result } = renderHook(() => useDashboardPermissions(DASHBOARD_ID), {
				wrapper: AllTheProviders,
			});

			await waitFor(() => expect(result.current.hasError).toBe(true));
			expect(result.current.canRead).toBe(false);
			expect(result.current.canEdit).toBe(false);
		});
	});

	describe('disabled', () => {
		it('fires no check when disabled', async () => {
			const onCheck = jest.fn();
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					onCheck();
					const payload = await req.json();
					return res(
						ctx.status(200),
						ctx.json({ data: payload, status: 'success' }),
					);
				}),
			);

			renderHook(() => useDashboardPermissions(DASHBOARD_ID, { enabled: false }), {
				wrapper: AllTheProviders,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(onCheck).not.toHaveBeenCalled();
		});
	});
});
