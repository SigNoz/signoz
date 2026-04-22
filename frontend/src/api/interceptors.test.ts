import axios, { AxiosHeaders, AxiosResponse } from 'axios';

import { interceptorRejected } from './index';

jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: jest.fn(() => 'mock-token'),
}));

jest.mock('api/v2/sessions/rotate/post', () => ({
	__esModule: true,
	default: jest.fn(() =>
		Promise.resolve({
			data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
		}),
	),
}));

jest.mock('AppRoutes/utils', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('axios', () => {
	const actualAxios = jest.requireActual('axios');
	const mockAxios = jest.fn().mockResolvedValue({ data: 'success' });

	return {
		...actualAxios,
		default: Object.assign(mockAxios, {
			...actualAxios.default,
			isAxiosError: jest.fn().mockReturnValue(true),
			create: actualAxios.create,
		}),
		__esModule: true,
	};
});

describe('interceptorRejected', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(axios as unknown as jest.Mock).mockResolvedValue({ data: 'success' });
		(axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
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

		const mockAxiosFn = axios as unknown as jest.Mock;
		expect(mockAxiosFn.mock.calls.length).toBe(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(Array.isArray(JSON.parse(retryCallConfig.data))).toBe(true);
		expect(JSON.parse(retryCallConfig.data)).toEqual(arrayPayload);
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

		const mockAxiosFn = axios as unknown as jest.Mock;
		expect(mockAxiosFn.mock.calls.length).toBe(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(JSON.parse(retryCallConfig.data)).toEqual(objectPayload);
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

		const mockAxiosFn = axios as unknown as jest.Mock;
		expect(mockAxiosFn.mock.calls.length).toBe(1);
		const retryCallConfig = mockAxiosFn.mock.calls[0][0];
		expect(retryCallConfig.data).toBeUndefined();
	});
});
