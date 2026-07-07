import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, waitFor } from '@testing-library/react';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { getIsNoAuthMode, setNoAuthMode } from 'utils/noAuthMode';
import { LOCALSTORAGE } from 'constants/localStorage';
import { SINGLE_FLIGHT_WAIT_TIME_MS } from 'lib/authz/hooks/useAuthZ/constants';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { USER_ROLES } from 'types/roles';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
} from 'lib/authz/utils/authz-test-utils';

import { AppProvider, useAppContext } from '../App';

const MY_USER_URL = 'http://localhost/api/v2/users/me';
const MY_ORG_URL = 'http://localhost/api/v2/orgs/me';
const GLOBAL_CONFIG_URL = 'http://localhost/api/v1/global/config';

jest.mock('constants/env', () => ({
	ENVIRONMENT: { baseURL: 'http://localhost', wsURL: '' },
}));

const waitForSinglePreflightToFinish = async (): Promise<void> =>
	await new Promise((r) => setTimeout(r, SINGLE_FLIGHT_WAIT_TIME_MS));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});

function createWrapper(): ({
	children,
}: {
	children: ReactElement;
}) => ReactElement {
	return function Wrapper({
		children,
	}: {
		children: ReactElement;
	}): ReactElement {
		return (
			<QueryClientProvider client={queryClient}>
				<AppProvider>{children}</AppProvider>
			</QueryClientProvider>
		);
	};
}

describe('AppProvider user.role from permissions', () => {
	beforeEach(() => {
		queryClient.clear();
		setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
	});

	it('sets user.role to ADMIN and hasEditPermission to true when admin permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, false, false])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.user.role).toBe(USER_ROLES.ADMIN);
				expect(result.current.hasEditPermission).toBe(true);
			},
			{ timeout: 2000 },
		);
	});

	it('sets user.role to EDITOR and hasEditPermission to true when only editor permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, true, false])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.user.role).toBe(USER_ROLES.EDITOR);
				expect(result.current.hasEditPermission).toBe(true);
			},
			{ timeout: 2000 },
		);
	});

	it('sets user.role to VIEWER and hasEditPermission to false when only viewer permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false, true])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.user.role).toBe(USER_ROLES.VIEWER);
				expect(result.current.hasEditPermission).toBe(false);
			},
			{ timeout: 2000 },
		);
	});

	it('sets user.role to ANONYMOUS and hasEditPermission to false when no role permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false, false])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.user.role).toBe(USER_ROLES.ANONYMOUS);
				expect(result.current.hasEditPermission).toBe(false);
			},
			{ timeout: 2000 },
		);
	});

	/**
	 * This is expected to not happen, but we'll test it just in case.
	 */
	describe('when multiple role permissions are granted', () => {
		it('prefers ADMIN over EDITOR and VIEWER when multiple role permissions are granted', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					const payload = await req.json();
					return res(
						ctx.status(200),
						ctx.json(authzMockResponse(payload, [true, true, true])),
					);
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useAppContext(), { wrapper });

			await waitFor(
				() => {
					expect(result.current.user.role).toBe(USER_ROLES.ADMIN);
					expect(result.current.hasEditPermission).toBe(true);
				},
				{ timeout: 300 },
			);
		});

		it('prefers EDITOR over VIEWER when editor and viewer permissions are granted', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					const payload = await req.json();
					return res(
						ctx.status(200),
						ctx.json(authzMockResponse(payload, [false, true, true])),
					);
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useAppContext(), { wrapper });

			await waitForSinglePreflightToFinish();

			await waitFor(
				() => {
					expect(result.current.user.role).toBe(USER_ROLES.EDITOR);
					expect(result.current.hasEditPermission).toBe(true);
				},
				{ timeout: 2000 },
			);
		});
	});
});

describe('AppProvider user and org data from v2 APIs', () => {
	beforeEach(() => {
		queryClient.clear();
		setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
	});

	it('populates user fields from GET /api/v2/users/me', async () => {
		server.use(
			rest.get(MY_USER_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: {
							id: 'u-123',
							displayName: 'Test User',
							email: 'test@signoz.io',
							orgId: 'org-abc',
							isRoot: false,
							status: 'active',
						},
					}),
				),
			),
			rest.get(MY_ORG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: { id: 'org-abc', displayName: 'My Org' } }),
				),
			),
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false, false])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitFor(
			() => {
				expect(result.current.user.id).toBe('u-123');
				expect(result.current.user.displayName).toBe('Test User');
				expect(result.current.user.email).toBe('test@signoz.io');
				expect(result.current.user.orgId).toBe('org-abc');
			},
			{ timeout: 2000 },
		);
	});

	it('sets isFetchingUser false once both user and org calls complete', async () => {
		server.use(
			rest.get(MY_USER_URL, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: { id: 'u-1', email: 'a@b.com' } })),
			),
			rest.get(MY_ORG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: { id: 'org-1', displayName: 'Org' } }),
				),
			),
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false, false])),
				);
			}),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitFor(
			() => {
				expect(result.current.isFetchingUser).toBe(false);
			},
			{ timeout: 2000 },
		);
	});
});

describe('AppProvider when authz/check fails', () => {
	beforeEach(() => {
		queryClient.clear();
		setLocalStorageApi(LOCALSTORAGE.IS_LOGGED_IN, 'true');
		server.use(
			rest.get(MY_USER_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: {
							id: 'u-1',
							displayName: 'Test User',
							email: 'test@signoz.io',
							orgId: 'org-1',
							isRoot: false,
							status: 'active',
						},
					}),
				),
			),
			rest.get(MY_ORG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: { id: 'org-1', displayName: 'Org' } }),
				),
			),
		);
	});

	it('does not set userFetchError when authz/check returns 500 (authz errors are ignored)', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ error: 'Internal Server Error' })),
			),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.userFetchError).toBeFalsy();
			},
			{ timeout: 2000 },
		);
	});

	it('does not set userFetchError when authz/check fails with network error (authz errors are ignored)', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_, res) => res.networkError('Network error')),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.userFetchError).toBeFalsy();
			},
			{ timeout: 2000 },
		);
	});
});

describe('AppProvider no-auth preflight', () => {
	beforeEach(() => {
		queryClient.clear();
	});

	afterEach(() => {
		setNoAuthMode(false);
	});

	it('sets noAuthMode singleton when impersonation is enabled', async () => {
		server.use(
			rest.get(GLOBAL_CONFIG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: { identN: { impersonation: { enabled: true } } },
					}),
				),
			),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitFor(
			() => {
				expect(result.current.isPreflightLoading).toBe(false);
			},
			{ timeout: 3000 },
		);

		expect(getIsNoAuthMode()).toBe(true);
	});

	it('leaves noAuthMode singleton false when impersonation is disabled', async () => {
		server.use(
			rest.get(GLOBAL_CONFIG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: { identN: { impersonation: { enabled: false } } },
					}),
				),
			),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitFor(
			() => {
				expect(result.current.isPreflightLoading).toBe(false);
			},
			{ timeout: 3000 },
		);

		expect(getIsNoAuthMode()).toBe(false);
	});

	it('clears stale auth tokens from localStorage and resets in-memory JWT state when impersonation is enabled', async () => {
		setLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN, 'stale-access-token');
		setLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN, 'stale-refresh-token');
		setLocalStorageApi(LOCALSTORAGE.LOGGED_IN_USER_EMAIL, 'old@example.com');
		setLocalStorageApi(LOCALSTORAGE.LOGGED_IN_USER_NAME, 'Old Name');

		server.use(
			rest.get(GLOBAL_CONFIG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: { identN: { impersonation: { enabled: true } } },
					}),
				),
			),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitFor(
			() => {
				expect(result.current.isPreflightLoading).toBe(false);
			},
			{ timeout: 3000 },
		);

		// localStorage cleared
		expect(localStorage.getItem(LOCALSTORAGE.AUTH_TOKEN)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.REFRESH_AUTH_TOKEN)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.LOGGED_IN_USER_EMAIL)).toBeNull();
		expect(localStorage.getItem(LOCALSTORAGE.LOGGED_IN_USER_NAME)).toBeNull();

		// in-memory JWTs reset so stale tokens don't linger in context or React Query keys
		expect(result.current.user.accessJwt).toBe('');
		expect(result.current.user.refreshJwt).toBe('');
	});

	it('transitions isPreflightLoading from true to false once preflight resolves', async () => {
		server.use(
			rest.get(GLOBAL_CONFIG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: { identN: { impersonation: { enabled: false } } },
					}),
				),
			),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		expect(result.current.isPreflightLoading).toBe(true);

		await waitFor(
			() => {
				expect(result.current.isPreflightLoading).toBe(false);
			},
			{ timeout: 3000 },
		);
	});
});
