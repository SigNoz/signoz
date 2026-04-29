import { ReactElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { AllTheProviders } from 'tests/test-utils';

import { BrandedPermission } from './types';
import { useAuthZ } from './useAuthZ';
import { buildPermission } from './utils';

const BASE_URL = ENVIRONMENT.baseURL || '';
const AUTHZ_CHECK_URL = `${BASE_URL}/api/v1/authz/check`;

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

const wrapper = ({ children }: { children: ReactElement }): ReactElement => (
	<AllTheProviders>{children}</AllTheProviders>
);

describe('useAuthZ', () => {
	it('should fetch and return permissions successfully', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

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

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).toBeNull();
		expect(result.current.permissions).toStrictEqual(expectedResponse);
	});

	it('should handle API errors', async () => {
		const permission = buildPermission('read', 'dashboard:*');

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
	});

	it('should refetch when permissions array changes', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');

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
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

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
		expect(result.current.error).toBeNull();
		expect(result.current.permissions).toStrictEqual({});
	});

	it('should send correct payload format to API', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

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
				resource: { name: 'dashboard', type: 'metaresource' },
				selector: '*',
			},
		});
		expect(receivedPayload[1]).toMatchObject({
			relation: 'update',
			object: {
				resource: { name: 'dashboard', type: 'metaresource' },
				selector: '123',
			},
		});
	});

	it('should batch multiple hooks into single flight request', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');

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
				resource: { name: 'dashboard', type: 'metaresource' },
				selector: '*',
			},
		});
		expect(receivedPayloads[0][1]).toMatchObject({
			relation: 'update',
			object: { resource: { name: 'dashboard' }, selector: '123' },
		});
		expect(receivedPayloads[0][2]).toMatchObject({
			relation: 'delete',
			object: { resource: { name: 'dashboard' }, selector: '456' },
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
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');

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
			object: { resource: { name: 'dashboard' }, selector: '123' },
		});
		expect(receivedPayloads[1][1]).toMatchObject({
			relation: 'delete',
			object: { resource: { name: 'dashboard' }, selector: '456' },
		});
	});

	it('should map permissions correctly when API returns response out of order', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');

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
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

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
