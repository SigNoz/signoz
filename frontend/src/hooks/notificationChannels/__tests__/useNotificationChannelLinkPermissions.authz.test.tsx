import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest } from 'msw';
import { server } from 'mocks-server/server';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import { useNotificationChannelLinkPermissions } from '../useNotificationChannelLinkPermissions';

const SLACK = '0196b8a2-6f3c-7b1e-9c4d-2a5e8f1b3c7d';
const PAGER = '0196b8a2-6f3c-7b1e-9c4d-2a5e8f1b3c7e';
const CHANNEL_IDS = [SLACK, PAGER];

describe('useNotificationChannelLinkPermissions - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('resolves attach and detach per channel', async () => {
		server.use(
			setupAuthzAllow(
				buildNotificationChannelAttachPermission(SLACK),
				buildNotificationChannelDetachPermission(PAGER),
			),
		);

		const { result } = renderHook(
			() => useNotificationChannelLinkPermissions(CHANNEL_IDS),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canAttach(SLACK)).toBe(true);
		expect(result.current.canDetach(SLACK)).toBe(false);
		expect(result.current.canAttach(PAGER)).toBe(false);
		expect(result.current.canDetach(PAGER)).toBe(true);
	});

	it('denies both when all are denied', async () => {
		server.use(setupAuthzDenyAll());

		const { result } = renderHook(
			() => useNotificationChannelLinkPermissions(CHANNEL_IDS),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.canAttach(SLACK)).toBe(false);
		expect(result.current.canDetach(SLACK)).toBe(false);
	});

	it('reports hasError when the check fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
		);

		const { result } = renderHook(
			() => useNotificationChannelLinkPermissions(CHANNEL_IDS),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(result.current.hasError).toBe(true));
	});

	it('fires no check without channels or when disabled', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderHook(() => useNotificationChannelLinkPermissions([]), {
			wrapper: AllTheProviders,
		});
		renderHook(
			() => useNotificationChannelLinkPermissions(CHANNEL_IDS, { enabled: false }),
			{ wrapper: AllTheProviders },
		);

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(onCheck).not.toHaveBeenCalled();
	});
});
