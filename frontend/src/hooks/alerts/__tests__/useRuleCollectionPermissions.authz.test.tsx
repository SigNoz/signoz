import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest } from 'msw';
import { server } from 'mocks-server/server';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { RuleListPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { useRuleCollectionPermissions } from '../useRuleCollectionPermissions';

describe('useRuleCollectionPermissions - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('grants list and create when both are granted', async () => {
		server.use(setupAuthzAdmin());

		const { result } = renderHook(() => useRuleCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({
			canList: true,
			canCreate: true,
			hasError: false,
		});
	});

	it('denies list and create when both are denied', async () => {
		server.use(setupAuthzDenyAll());

		const { result } = renderHook(() => useRuleCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canList).toBe(false);
		expect(result.current.canCreate).toBe(false);
	});

	it('grants list without create, as for a viewer', async () => {
		server.use(setupAuthzAllow(RuleListPermission));

		const { result } = renderHook(() => useRuleCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canList).toBe(true);
		expect(result.current.canCreate).toBe(false);
	});

	it('reports hasError and grants nothing when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);

		const { result } = renderHook(() => useRuleCollectionPermissions(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.hasError).toBe(true));
		expect(result.current.canList).toBe(false);
		expect(result.current.canCreate).toBe(false);
	});
});
