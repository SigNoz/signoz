import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, waitFor } from '@testing-library/react';
import setLocalStorageApi from 'api/browser/localstorage/set';
import type {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { SINGLE_FLIGHT_WAIT_TIME_MS } from 'hooks/useAuthZ/constants';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { USER_ROLES } from 'types/roles';

import { AppProvider, useAppContext } from '../App';

const AUTHZ_CHECK_URL = 'http://localhost/api/v1/authz/check';
const MY_USER_URL = 'http://localhost/api/v2/users/me';
const MY_ORG_URL = 'http://localhost/api/v2/orgs/me';

jest.mock('constants/env', () => ({
	ENVIRONMENT: { baseURL: 'http://localhost', wsURL: '' },
}));

/**
 * Since we are mocking the check permissions, this is needed
 */
const waitForSinglePreflightToFinish = async (): Promise<void> =>
	await new Promise((r) => setTimeout(r, SINGLE_FLIGHT_WAIT_TIME_MS));

function authzMockResponse(
	payload: AuthtypesTransactionDTO[],
	authorizedByIndex: boolean[],
): { data: AuthtypesGettableTransactionDTO[]; status: string } {
	return {
		data: payload.map((txn, i) => ({
			relation: txn.relation,
			object: txn.object,
			authorized: authorizedByIndex[i] ?? false,
		})),
		status: 'success',
	};
}

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

	it('populates org state from GET /api/v2/orgs/me', async () => {
		server.use(
			rest.get(MY_ORG_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: {
							id: 'org-abc',
							displayName: 'My Org',
						},
					}),
				),
			),
			rest.get(MY_USER_URL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: { id: 'u-default', email: 'default@signoz.io' } }),
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
				expect(result.current.org).not.toBeNull();
				const org = result.current.org?.[0];
				expect(org?.id).toBe('org-abc');
				expect(org?.displayName).toBe('My Org');
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
	});

	it('sets userFetchError when authz/check returns 500 (same as user fetch error)', async () => {
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
				expect(result.current.userFetchError).toBeTruthy();
			},
			{ timeout: 2000 },
		);
	});

	it('sets userFetchError when authz/check fails with network error (same as user fetch error)', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_, res) => res.networkError('Network error')),
		);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useAppContext(), { wrapper });

		await waitForSinglePreflightToFinish();

		await waitFor(
			() => {
				expect(result.current.userFetchError).toBeTruthy();
			},
			{ timeout: 2000 },
		);
	});
});
