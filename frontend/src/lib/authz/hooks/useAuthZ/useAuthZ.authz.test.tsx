import { ReactElement } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQueryClient } from 'react-query';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { AllTheProviders } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
} from 'lib/authz/utils/authz-test-utils';

import { BrandedPermission } from './types';
import { useAuthZ } from './useAuthZ';
import { buildPermission } from './utils';

const wrapper = ({ children }: { children: ReactElement }): ReactElement => (
	<AllTheProviders>{children}</AllTheProviders>
);

describe('useAuthZ', () => {
	it('should fetch and return permissions successfully', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		const expectedResponse = {
			[permission1]: {
				isGranted: true,
			},
			[permission2]: {
				isGranted: false,
			},
		};

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, false])),
				);
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission1, permission2]), {
			wrapper,
		});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.permissions).toBeNull();
		expect(result.current.allowed).toBe(false);
		expect(result.current.deniedPermissions).toStrictEqual([]);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.permissions).toStrictEqual(expectedResponse);
		expect(result.current.allowed).toBe(false);
		expect(result.current.deniedPermissions).toStrictEqual([permission2]);
	});

	it('should return error and null permissions when API errors', async () => {
		const permission = buildPermission('read', 'role:*');

		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).not.toBeNull();
		expect(result.current.permissions).toBeNull();
		expect(result.current.allowed).toBe(false);
		expect(result.current.deniedPermissions).toStrictEqual([]);
	});

	it('should set allowed to true when all permissions are granted', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, true])),
				);
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission1, permission2]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.allowed).toBe(true);
		expect(result.current.deniedPermissions).toStrictEqual([]);
	});

	it('should collect all denied permissions when multiple are denied', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false])),
				);
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission1, permission2]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.allowed).toBe(false);
		expect(result.current.deniedPermissions).toStrictEqual([
			permission1,
			permission2,
		]);
	});

	it('should not fetch when enabled is false', async () => {
		let requestCount = 0;
		const permission = buildPermission('read', 'role:*');

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount += 1;
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const { result } = renderHook(
			() => useAuthZ([permission], { enabled: false }),
			{ wrapper },
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(0);
		expect(result.current.allowed).toBe(false);
		expect(result.current.permissions).toStrictEqual({});
	});

	it('should refetch when permissions array changes', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');
		const permission3 = buildPermission('delete', 'role:456');

		let requestCount = 0;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();

				if (payload.length === 1) {
					return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
				}

				const authorized = payload.map(
					(txn: { relation: string }) =>
						txn.relation === 'read' || txn.relation === 'delete',
				);
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, authorized)),
				);
			}),
		);

		const { result, rerender } = renderHook<
			ReturnType<typeof useAuthZ>,
			BrandedPermission[]
		>((permissions) => useAuthZ(permissions), {
			wrapper,
			initialProps: [permission1],
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(1);
		expect(result.current.permissions).toStrictEqual({
			[permission1]: {
				isGranted: true,
			},
		});

		rerender([permission1, permission2, permission3]);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(2);
		expect(result.current.permissions).toStrictEqual({
			[permission1]: {
				isGranted: true,
			},
			[permission2]: {
				isGranted: false,
			},
			[permission3]: {
				isGranted: true,
			},
		});
	});

	it('should not refetch when permissions array order changes but content is the same', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		let requestCount = 0;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, false])),
				);
			}),
		);

		const { result, rerender } = renderHook<
			ReturnType<typeof useAuthZ>,
			BrandedPermission[]
		>((permissions) => useAuthZ(permissions), {
			wrapper,
			initialProps: [permission1, permission2],
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(1);

		rerender([permission2, permission1]);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(1);
	});

	it('should handle empty permissions array', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({ data: [], status: 'success' }));
			}),
		);

		const { result } = renderHook(() => useAuthZ([]), {
			wrapper,
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.permissions).toStrictEqual({});
	});

	it('should send correct payload format to API', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		let receivedPayload: any = null;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				receivedPayload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(receivedPayload, [true, false])),
				);
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission1, permission2]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(receivedPayload).toHaveLength(2);
		expect(receivedPayload[0]).toMatchObject({
			relation: 'read',
			object: {
				resource: { kind: 'role', type: 'role' },
				selector: '*',
			},
		});
		expect(receivedPayload[1]).toMatchObject({
			relation: 'update',
			object: {
				resource: { kind: 'role', type: 'role' },
				selector: '123',
			},
		});
	});

	it('should batch multiple hooks into single flight request', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');
		const permission3 = buildPermission('delete', 'role:456');

		let requestCount = 0;
		const receivedPayloads: any[] = [];

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				receivedPayloads.push(payload);
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, false, true])),
				);
			}),
		);

		const { result: result1 } = renderHook(() => useAuthZ([permission1]), {
			wrapper,
		});

		const { result: result2 } = renderHook(() => useAuthZ([permission2]), {
			wrapper,
		});

		const { result: result3 } = renderHook(() => useAuthZ([permission3]), {
			wrapper,
		});

		await waitFor(
			() => {
				expect(result1.current.isLoading).toBe(false);
				expect(result2.current.isLoading).toBe(false);
				expect(result3.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);

		expect(requestCount).toBe(1);
		expect(receivedPayloads).toHaveLength(1);
		expect(receivedPayloads[0]).toHaveLength(3);
		expect(receivedPayloads[0][0]).toMatchObject({
			relation: 'read',
			object: {
				resource: { kind: 'role', type: 'role' },
				selector: '*',
			},
		});
		expect(receivedPayloads[0][1]).toMatchObject({
			relation: 'update',
			object: { resource: { kind: 'role' }, selector: '123' },
		});
		expect(receivedPayloads[0][2]).toMatchObject({
			relation: 'delete',
			object: { resource: { kind: 'role' }, selector: '456' },
		});

		expect(result1.current.permissions).toStrictEqual({
			[permission1]: { isGranted: true },
		});
		expect(result2.current.permissions).toStrictEqual({
			[permission2]: { isGranted: false },
		});
		expect(result3.current.permissions).toStrictEqual({
			[permission3]: { isGranted: true },
		});
	});

	it('should create separate batches for calls after single flight window', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');
		const permission3 = buildPermission('delete', 'role:456');

		let requestCount = 0;
		const receivedPayloads: any[] = [];

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				receivedPayloads.push(payload);
				const authorized = payload.length === 1 ? [true] : [false, true];
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, authorized)),
				);
			}),
		);

		const { result: result1 } = renderHook(() => useAuthZ([permission1]), {
			wrapper,
		});

		await waitFor(
			() => {
				expect(result1.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);

		expect(requestCount).toBe(1);
		expect(receivedPayloads[0]).toHaveLength(1);

		await new Promise((resolve) => setTimeout(resolve, 100));

		const { result: result2 } = renderHook(() => useAuthZ([permission2]), {
			wrapper,
		});

		const { result: result3 } = renderHook(() => useAuthZ([permission3]), {
			wrapper,
		});

		await waitFor(
			() => {
				expect(result2.current.isLoading).toBe(false);
				expect(result3.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);

		expect(requestCount).toBe(2);
		expect(receivedPayloads).toHaveLength(2);
		expect(receivedPayloads[1]).toHaveLength(2);
		expect(receivedPayloads[1][0]).toMatchObject({
			relation: 'update',
			object: { resource: { kind: 'role' }, selector: '123' },
		});
		expect(receivedPayloads[1][1]).toMatchObject({
			relation: 'delete',
			object: { resource: { kind: 'role' }, selector: '456' },
		});
	});

	it('should map permissions correctly when API returns response out of order', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');
		const permission3 = buildPermission('delete', 'role:456');

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				const reversed = [...payload].reverse();
				const authorizedByReversed = [true, false, true];
				return res(
					ctx.status(200),
					ctx.json({
						data: reversed.map((txn: any, i: number) => ({
							relation: txn.relation,
							object: txn.object,
							authorized: authorizedByReversed[i],
						})),
						status: 'success',
					}),
				);
			}),
		);

		const { result } = renderHook(
			() => useAuthZ([permission1, permission2, permission3]),
			{ wrapper },
		);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.permissions).toStrictEqual({
			[permission1]: { isGranted: true },
			[permission2]: { isGranted: false },
			[permission3]: { isGranted: true },
		});
	});

	it('should not leak state between separate batches', async () => {
		const permission1 = buildPermission('read', 'role:*');
		const permission2 = buildPermission('update', 'role:123');

		let requestCount = 0;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				const authorized = payload.map(
					(txn: { relation: string }) => txn.relation === 'read',
				);
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, authorized)),
				);
			}),
		);

		const { result: result1 } = renderHook(() => useAuthZ([permission1]), {
			wrapper,
		});

		await waitFor(
			() => {
				expect(result1.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);

		expect(requestCount).toBe(1);
		expect(result1.current.permissions).toStrictEqual({
			[permission1]: { isGranted: true },
		});

		await new Promise((resolve) => setTimeout(resolve, 100));

		const { result: result2 } = renderHook(() => useAuthZ([permission2]), {
			wrapper,
		});

		await waitFor(
			() => {
				expect(result2.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);

		expect(requestCount).toBe(2);
		expect(result1.current.permissions).toStrictEqual({
			[permission1]: { isGranted: true },
		});
		expect(result2.current.permissions).toStrictEqual({
			[permission2]: { isGranted: false },
		});
		expect(result1.current.permissions).not.toHaveProperty(permission2);
		expect(result2.current.permissions).not.toHaveProperty(permission1);
	});
});

describe('useAuthZ cache invalidation', () => {
	it('should re-render with updated data when query is invalidated', async () => {
		const permission = buildPermission('read', 'role:*');

		let requestCount = 0;
		let shouldGrant = true;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [shouldGrant])),
				);
			}),
		);

		const { result } = renderHook(
			() => {
				const queryClient = useQueryClient();
				const authz = useAuthZ([permission]);
				return { authz, queryClient };
			},
			{ wrapper },
		);

		await waitFor(() => {
			expect(result.current.authz.isLoading).toBe(false);
		});

		expect(requestCount).toBe(1);
		expect(result.current.authz.allowed).toBe(true);
		expect(result.current.authz.permissions).toStrictEqual({
			[permission]: { isGranted: true },
		});

		// Change server response and reset query (forces refetch)
		shouldGrant = false;

		await act(async () => {
			await result.current.queryClient.resetQueries(['authz', permission]);
		});

		await waitFor(() => {
			expect(result.current.authz.allowed).toBe(false);
		});

		expect(requestCount).toBe(2);
		expect(result.current.authz.permissions).toStrictEqual({
			[permission]: { isGranted: false },
		});
	});

	it('should re-render all components using the same permission when invalidated', async () => {
		const permission = buildPermission('update', 'role:123');

		let requestCount = 0;
		let shouldGrant = true;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [shouldGrant])),
				);
			}),
		);

		// Two separate hooks using the same permission
		const { result: result1 } = renderHook(
			() => {
				const queryClient = useQueryClient();
				const authz = useAuthZ([permission]);
				return { authz, queryClient };
			},
			{ wrapper },
		);

		const { result: result2 } = renderHook(() => useAuthZ([permission]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result1.current.authz.isLoading).toBe(false);
			expect(result2.current.isLoading).toBe(false);
		});

		// Both should show granted, single batched request
		expect(requestCount).toBe(1);
		expect(result1.current.authz.allowed).toBe(true);
		expect(result2.current.allowed).toBe(true);

		// Change server response and reset query (forces refetch)
		shouldGrant = false;

		await act(async () => {
			await result1.current.queryClient.resetQueries(['authz', permission]);
		});

		// Both hooks should update
		await waitFor(() => {
			expect(result1.current.authz.allowed).toBe(false);
			expect(result2.current.allowed).toBe(false);
		});

		expect(result1.current.authz.permissions).toStrictEqual({
			[permission]: { isGranted: false },
		});
		expect(result2.current.permissions).toStrictEqual({
			[permission]: { isGranted: false },
		});
	});
});
