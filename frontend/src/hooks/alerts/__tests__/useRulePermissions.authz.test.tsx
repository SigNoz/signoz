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
	buildRuleAttachPermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { useRulePermissions } from '../useRulePermissions';

const RULE_ID = '0196b8a2-6f3c-7b1e-9c4d-2a5e8f1b3c7d';

describe('useRulePermissions - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('grants every verb when all are granted', async () => {
		server.use(setupAuthzAdmin());

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({
			canRead: true,
			canUpdate: true,
			canDelete: true,
			canEdit: true,
			canClone: true,
			canAttach: true,
			canDetach: true,
			hasError: false,
		});
	});

	it('denies every verb when all are denied', async () => {
		server.use(setupAuthzDenyAll());

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({
			canRead: false,
			canUpdate: false,
			canDelete: false,
			canEdit: false,
			canClone: false,
			canAttach: false,
			canDetach: false,
		});
	});

	it('denies canEdit when update is granted but read is not', async () => {
		server.use(setupAuthzAllow(buildRuleUpdatePermission(RULE_ID)));

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canUpdate).toBe(true);
		expect(result.current.canEdit).toBe(false);
	});

	it('denies canClone when read is granted but create is not', async () => {
		server.use(setupAuthzAllow(buildRuleReadPermission(RULE_ID)));

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canRead).toBe(true);
		expect(result.current.canClone).toBe(false);
	});

	it('denies canClone when create is granted but read is not', async () => {
		server.use(setupAuthzAllow(RuleCreatePermission));

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canClone).toBe(false);
	});

	it('grants canClone with read on the rule and create on all rules', async () => {
		server.use(
			setupAuthzAllow(buildRuleReadPermission(RULE_ID), RuleCreatePermission),
		);

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canClone).toBe(true);
		expect(result.current.canUpdate).toBe(false);
	});

	it('resolves attach independently of detach', async () => {
		server.use(setupAuthzAllow(buildRuleAttachPermission(RULE_ID)));

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canAttach).toBe(true);
		expect(result.current.canDetach).toBe(false);
	});

	it('names read and update in editChecks, read and create in cloneChecks', () => {
		const { result } = renderHook(
			() => useRulePermissions(RULE_ID, { enabled: false }),
			{ wrapper: AllTheProviders },
		);

		expect(result.current.editChecks).toStrictEqual([
			buildRuleReadPermission(RULE_ID),
			buildRuleUpdatePermission(RULE_ID),
		]);
		expect(result.current.cloneChecks).toStrictEqual([
			buildRuleReadPermission(RULE_ID),
			RuleCreatePermission,
		]);
	});

	it('reports hasError and grants nothing when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);

		const { result } = renderHook(() => useRulePermissions(RULE_ID), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.hasError).toBe(true));
		expect(result.current.canRead).toBe(false);
		expect(result.current.canEdit).toBe(false);
	});

	it('fires no check when disabled', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				onCheck();
				const payload = await req.json();
				return res(ctx.status(200), ctx.json({ data: payload, status: 'success' }));
			}),
		);

		renderHook(() => useRulePermissions(RULE_ID, { enabled: false }), {
			wrapper: AllTheProviders,
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(onCheck).not.toHaveBeenCalled();
	});
});
