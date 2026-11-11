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
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
	RoutePolicyListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';

import { useRoutePolicyCollectionPermissions } from '../useRoutePolicyCollectionPermissions';

describe('useRoutePolicyCollectionPermissions - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('grants list and create when all are granted', async () => {
		server.use(setupAuthzAdmin());

		const { result } = renderHook(() => useRoutePolicyCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({
			canList: true,
			canCreate: true,
			hasError: false,
		});
	});

	it('denies list and create when all are denied', async () => {
		server.use(setupAuthzDenyAll());

		const { result } = renderHook(() => useRoutePolicyCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canList).toBe(false);
		expect(result.current.canCreate).toBe(false);
	});

	it('denies create without attach, since a new policy links its channels', async () => {
		server.use(
			setupAuthzAllow(RoutePolicyListPermission, RoutePolicyCreatePermission),
		);

		const { result } = renderHook(() => useRoutePolicyCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canList).toBe(true);
		expect(result.current.canCreate).toBe(false);
	});

	it('denies create with attach but without create', async () => {
		server.use(setupAuthzAllow(RoutePolicyAttachPermission));

		const { result } = renderHook(() => useRoutePolicyCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canCreate).toBe(false);
	});

	it('reports hasError and grants nothing when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);

		const { result } = renderHook(() => useRoutePolicyCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.hasError).toBe(true));
		expect(result.current.canList).toBe(false);
		expect(result.current.canCreate).toBe(false);
	});
});
