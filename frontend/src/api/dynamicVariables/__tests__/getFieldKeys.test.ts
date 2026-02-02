/* eslint-disable sonarjs/no-duplicate-string */
import axios from 'api';

import { getFieldKeys } from '../getFieldKeys';

// Mock the API instance
jest.mock('api', () => ({
	get: jest.fn(),
}));

describe('getFieldKeys API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const mockSuccessResponse = {
		status: 200,
		data: {
			status: 'success',
			data: {
				keys: {
					'service.name': [],
					'http.status_code': [],
				},
				complete: true,
			},
		},
	};

	it('should call API with correct parameters when no args provided', async () => {
		// Mock successful API response
		(axios.get as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

		// Call function with no parameters
		await getFieldKeys();

		// Verify API was called correctly with empty params object
		expect(axios.get).toHaveBeenCalledWith('/fields/keys', {
			params: {},
		});
	});

	it('should call API with signal parameter when provided', async () => {
		// Mock successful API response
		(axios.get as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

		// Call function with signal parameter
		await getFieldKeys('traces');

		// Verify API was called with signal parameter
		expect(axios.get).toHaveBeenCalledWith('/fields/keys', {
			params: { signal: 'traces' },
		});
	});

	it('should call API with name parameter when provided', async () => {
		// Mock successful API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					keys: { service: [] },
					complete: false,
				},
			},
		});

		// Call function with name parameter
		await getFieldKeys(undefined, 'service');

		// Verify API was called with name parameter
		expect(axios.get).toHaveBeenCalledWith('/fields/keys', {
			params: { name: 'service' },
		});
	});

	it('should call API with both signal and name when provided', async () => {
		// Mock successful API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					keys: { service: [] },
					complete: false,
				},
			},
		});

		// Call function with both parameters
		await getFieldKeys('logs', 'service');

		// Verify API was called with both parameters
		expect(axios.get).toHaveBeenCalledWith('/fields/keys', {
			params: { signal: 'logs', name: 'service' },
		});
	});

	it('should return properly formatted response', async () => {
		// Mock API to return our response
		(axios.get as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

		// Call the function
		const result = await getFieldKeys('traces');

		// Verify the returned structure matches SuccessResponseV2 format
		expect(result).toEqual({
			httpStatusCode: 200,
			data: mockSuccessResponse.data.data,
		});
	});
});
