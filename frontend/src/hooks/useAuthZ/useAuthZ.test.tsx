import { ReactElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { AllTheProviders } from 'tests/test-utils';

import { useAuthZ } from './useAuthZ';
import { BrandedPermission, buildPermission } from './utils';

const BASE_URL = ENVIRONMENT.baseURL || '';

const wrapper = ({ children }: { children: ReactElement }): ReactElement => (
	<AllTheProviders>{children}</AllTheProviders>
);

describe('useAuthZ', () => {
	it('should fetch and return permissions successfully', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

		const mockApiResponse = {
			[permission1]: true,
			[permission2]: false,
		};

		const expectedResponse = {
			[permission1]: {
				isGranted: true,
			},
			[permission2]: {
				isGranted: false,
			},
		};

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json(mockApiResponse));
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
		expect(result.current.permissions).toEqual(expectedResponse);
	});

	it('should handle API errors', async () => {
		const permission = buildPermission('read', 'dashboard:*');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (req, res, ctx) => {
				requestCount++;
				const body = req.body as {
					permissions: Array<{ relation: string; object: string }>;
				};

				if (body.permissions.length === 1) {
					return res(
						ctx.status(200),
						ctx.json({
							[permission1]: true,
						}),
					);
				}

				return res(
					ctx.status(200),
					ctx.json({
						[permission1]: true,
						[permission2]: false,
						[permission3]: true,
					}),
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
		expect(result.current.permissions).toEqual({
			[permission1]: {
				isGranted: true,
			},
		});

		rerender([permission1, permission2, permission3]);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(requestCount).toBe(2);
		expect(result.current.permissions).toEqual({
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				requestCount++;
				return res(
					ctx.status(200),
					ctx.json({
						[permission1]: true,
						[permission2]: false,
					}),
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const { result } = renderHook(() => useAuthZ([]), {
			wrapper,
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.permissions).toEqual({});
	});

	it('should send correct payload format to API', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');

		let receivedPayload: any = null;

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, async (req, res, ctx) => {
				receivedPayload = await req.json();
				return res(
					ctx.status(200),
					ctx.json({
						[permission1]: true,
						[permission2]: false,
					}),
				);
			}),
		);

		const { result } = renderHook(() => useAuthZ([permission1, permission2]), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(receivedPayload).toEqual({
			permissions: [
				{ relation: 'read', object: 'dashboard:*' },
				{ relation: 'update', object: 'dashboard:123' },
			],
		});
	});

	it('should batch multiple hooks into single flight request', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');
		const permission4 = buildPermission('create', 'dashboards');

		let requestCount = 0;
		const receivedPayloads: any[] = [];

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				receivedPayloads.push(payload);

				const allPermissions = [permission1, permission2, permission3, permission4];

				const response: Record<string, boolean> = {};
				payload.permissions.forEach((p: { relation: string; object: string }) => {
					const perm = `${p.relation}/${p.object}` as BrandedPermission;
					if (allPermissions.includes(perm)) {
						response[perm] = perm === permission1 || perm === permission3;
					}
				});

				return res(ctx.status(200), ctx.json(response));
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
		expect(receivedPayloads[0].permissions).toHaveLength(3);
		expect(receivedPayloads[0].permissions).toEqual(
			expect.arrayContaining([
				{ relation: 'read', object: 'dashboard:*' },
				{ relation: 'update', object: 'dashboard:123' },
				{ relation: 'delete', object: 'dashboard:456' },
			]),
		);

		expect(result1.current.permissions).toEqual({
			[permission1]: { isGranted: true },
		});
		expect(result2.current.permissions).toEqual({
			[permission2]: { isGranted: false },
		});
		expect(result3.current.permissions).toEqual({
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();
				receivedPayloads.push(payload);

				const response: Record<string, boolean> = {};
				payload.permissions.forEach((p: { relation: string; object: string }) => {
					const perm = `${p.relation}/${p.object}` as BrandedPermission;
					response[perm] = perm === permission1 || perm === permission3;
				});

				return res(ctx.status(200), ctx.json(response));
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
		expect(receivedPayloads[0].permissions).toHaveLength(1);

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
		expect(receivedPayloads[1].permissions).toHaveLength(2);
		expect(receivedPayloads[1].permissions).toEqual(
			expect.arrayContaining([
				{ relation: 'update', object: 'dashboard:123' },
				{ relation: 'delete', object: 'dashboard:456' },
			]),
		);
	});

	it('should not leak state between separate batches', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('update', 'dashboard:123');
		const permission3 = buildPermission('delete', 'dashboard:456');

		let requestCount = 0;

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, async (req, res, ctx) => {
				requestCount++;
				const payload = await req.json();

				const response: Record<string, boolean> = {};
				payload.permissions.forEach((p: { relation: string; object: string }) => {
					const perm = `${p.relation}/${p.object}` as BrandedPermission;
					response[perm] = perm === permission1 || perm === permission3;
				});

				return res(ctx.status(200), ctx.json(response));
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
		expect(result1.current.permissions).toEqual({
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
		expect(result1.current.permissions).toEqual({
			[permission1]: { isGranted: true },
		});
		expect(result2.current.permissions).toEqual({
			[permission2]: { isGranted: false },
		});
		expect(result1.current.permissions).not.toHaveProperty(permission2);
		expect(result2.current.permissions).not.toHaveProperty(permission1);
	});
});
