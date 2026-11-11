import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest } from 'msw';
import { server } from 'mocks-server/server';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { useRuleLinkPermissions } from '../useRuleLinkPermissions';

const CPU_RULE = '0196b8a2-6f3c-7b1e-9c4d-2a5e8f1b3c7d';
const LATENCY_RULE = '0196b8a2-6f3c-7b1e-9c4d-2a5e8f1b3c7e';
const RULE_IDS = [CPU_RULE, LATENCY_RULE];

describe('useRuleLinkPermissions - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('resolves attach and detach per rule', async () => {
		server.use(
			setupAuthzAllow(
				buildRuleAttachPermission(CPU_RULE),
				buildRuleDetachPermission(LATENCY_RULE),
			),
		);

		const { result } = renderHook(() => useRuleLinkPermissions(RULE_IDS), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canAttach(CPU_RULE)).toBe(true);
		expect(result.current.canDetach(CPU_RULE)).toBe(false);
		expect(result.current.canAttach(LATENCY_RULE)).toBe(false);
		expect(result.current.canDetach(LATENCY_RULE)).toBe(true);
	});

	it('denies both when all are denied', async () => {
		server.use(setupAuthzDenyAll());

		const { result } = renderHook(() => useRuleLinkPermissions(RULE_IDS), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canAttach(CPU_RULE)).toBe(false);
		expect(result.current.canDetach(CPU_RULE)).toBe(false);
	});

	it('reports hasError when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);

		const { result } = renderHook(() => useRuleLinkPermissions(RULE_IDS), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.hasError).toBe(true));
	});

	it('fires no check without rules or when disabled', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderHook(() => useRuleLinkPermissions([]), {
			wrapper: AllTheProviders,
		});
		renderHook(() => useRuleLinkPermissions(RULE_IDS, { enabled: false }), {
			wrapper: AllTheProviders,
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(onCheck).not.toHaveBeenCalled();
	});
});
