import type { Mock } from 'vitest';

import axios, { AxiosHeaders, AxiosResponse } from 'axios';

import { interceptorRejected } from './index';

vi.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: vi.fn(() => 'mock-token'),
}));

vi.mock('api/v2/sessions/rotate/post', () => ({
	__esModule: true,
	default: vi.fn(() =>
		Promise.resolve({
			data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
		}),
	),
}));

vi.mock('AppRoutes/utils', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('axios', async () => {
	const actualAxios = await vi.importActual('axios');
	const mockAxios = vi.fn().mockResolvedValue({ data: 'success' });

	return {
		...(actualAxios as object),
		default: Object.assign(mockAxios, {
			...(actualAxios as { default: object }).default,
			isAxiosError: vi.fn().mockReturnValue(true),
			create: (actualAxios as { create: unknown }).create,
		}),
		__esModule: true,
	};
});

describe('interceptorRejected', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(axios as unknown as Mock).mockResolvedValue({ data: 'success' });
		(axios.isAxiosError as unknown as Mock).mockReturnValue(true);
	});

	it('should preserve array payload structure when retrying a 401 request', async () => {
		const arrayPayload = [
			{ relation: 'assignee', object: { resource: { name: 'role' } } },
			{ relation: 'assignee', object: { resource: { name: 'editor' } } },
		];

		const error = {
			response: {
				status: 401,
				config: {
					url: '/some-endpoint',
					method: 'POST',
					baseURL: 'http://localhost/',
					headers: new AxiosHeaders(),
					data: JSON.stringify(arrayPayload),
				},
			},
			config: {
				url: '/some-endpoint',
				method: 'POST',
				baseURL: 'http://localhost/',
				headers: new AxiosHeaders(),
				data: JSON.stringify(arrayPayload),
			},
		} as unknown as AxiosResponse;

		try {
			await interceptorRejected(error);
		} catch {
			// Expected to reject after retry
		}

		const mockAxiosFn = axios as unknown as Mock;
		expect(mockAxiosFn.mock.calls).toHaveLength(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(Array.isArray(JSON.parse(retryCallConfig.data))).toBe(true);
		expect(JSON.parse(retryCallConfig.data)).toStrictEqual(arrayPayload);
	});

	it('should preserve object payload structure when retrying a 401 request', async () => {
		const objectPayload = { key: 'value', nested: { data: 123 } };

		const error = {
			response: {
				status: 401,
				config: {
					url: '/some-endpoint',
					method: 'POST',
					baseURL: 'http://localhost/',
					headers: new AxiosHeaders(),
					data: JSON.stringify(objectPayload),
				},
			},
			config: {
				url: '/some-endpoint',
				method: 'POST',
				baseURL: 'http://localhost/',
				headers: new AxiosHeaders(),
				data: JSON.stringify(objectPayload),
			},
		} as unknown as AxiosResponse;

		try {
			await interceptorRejected(error);
		} catch {
			// Expected to reject after retry
		}

		const mockAxiosFn = axios as unknown as Mock;
		expect(mockAxiosFn.mock.calls).toHaveLength(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(JSON.parse(retryCallConfig.data)).toStrictEqual(objectPayload);
	});

	it('should handle undefined data gracefully when retrying', async () => {
		const error = {
			response: {
				status: 401,
				config: {
					url: '/some-endpoint',
					method: 'GET',
					baseURL: 'http://localhost/',
					headers: new AxiosHeaders(),
					data: undefined,
				},
			},
			config: {
				url: '/some-endpoint',
				method: 'GET',
				baseURL: 'http://localhost/',
				headers: new AxiosHeaders(),
				data: undefined,
			},
		} as unknown as AxiosResponse;

		try {
			await interceptorRejected(error);
		} catch {
			// Expected to reject after retry
		}

		const mockAxiosFn = axios as unknown as Mock;
		expect(mockAxiosFn.mock.calls).toHaveLength(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(retryCallConfig.data).toBeUndefined();
	});
});
