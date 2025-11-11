/* eslint-disable sonarjs/no-duplicate-string */
import axios from 'api';

import { getFieldValues } from '../getFieldValues';

// Mock the API instance
jest.mock('api', () => ({
	get: jest.fn(),
}));

describe('getFieldValues API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call the API with correct parameters (no options)', async () => {
		// Mock API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
					},
					complete: true,
				},
			},
		});

		// Call function without parameters
		await getFieldValues();

		// Verify API was called correctly with empty params
		expect(axios.get).toHaveBeenCalledWith('/fields/values', {
			params: {},
		});
	});

	it('should call the API with signal parameter', async () => {
		// Mock API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
					},
					complete: true,
				},
			},
		});

		// Call function with signal parameter
		await getFieldValues('traces');

		// Verify API was called with signal parameter
		expect(axios.get).toHaveBeenCalledWith('/fields/values', {
			params: { signal: 'traces' },
		});
	});

	it('should call the API with name parameter', async () => {
		// Mock API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
					},
					complete: true,
				},
			},
		});

		// Call function with name parameter
		await getFieldValues(undefined, 'service.name');

		// Verify API was called with name parameter
		expect(axios.get).toHaveBeenCalledWith('/fields/values', {
			params: { name: 'service.name' },
		});
	});

	it('should call the API with value parameter', async () => {
		// Mock API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend'],
					},
					complete: false,
				},
			},
		});

		// Call function with value parameter
		await getFieldValues(undefined, 'service.name', 'front');

		// Verify API was called with value parameter
		expect(axios.get).toHaveBeenCalledWith('/fields/values', {
			params: { name: 'service.name', searchText: 'front' },
		});
	});

	it('should call the API with time range parameters', async () => {
		// Mock API response
		(axios.get as jest.Mock).mockResolvedValueOnce({
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
					},
					complete: true,
				},
			},
		});

		// Call function with time range parameters
		const startUnixMilli = 1625097600000000; // Note: nanoseconds
		const endUnixMilli = 1625184000000000;
		await getFieldValues(
			'logs',
			'service.name',
			undefined,
			startUnixMilli,
			endUnixMilli,
		);

		// Verify API was called with time range parameters (converted to milliseconds)
		expect(axios.get).toHaveBeenCalledWith('/fields/values', {
			params: {
				signal: 'logs',
				name: 'service.name',
				startUnixMilli: '1625097600', // Should be converted to seconds (divided by 1000000)
				endUnixMilli: '1625184000', // Should be converted to seconds (divided by 1000000)
			},
		});
	});

	it('should normalize the response values', async () => {
		// Mock API response with multiple value types
		const mockResponse = {
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
						numberValues: [200, 404],
						boolValues: [true, false],
					},
					complete: true,
				},
			},
		};

		(axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

		// Call the function
		const result = await getFieldValues('traces', 'mixed.values');

		// Verify the response has normalized values array
		expect(result.data?.normalizedValues).toContain('frontend');
		expect(result.data?.normalizedValues).toContain('backend');
		expect(result.data?.normalizedValues).toContain('200');
		expect(result.data?.normalizedValues).toContain('404');
		expect(result.data?.normalizedValues).toContain('true');
		expect(result.data?.normalizedValues).toContain('false');
		expect(result.data?.normalizedValues?.length).toBe(6);
	});

	it('should return a properly formatted success response', async () => {
		// Create mock response
		const mockApiResponse = {
			status: 200,
			data: {
				status: 'success',
				data: {
					values: {
						stringValues: ['frontend', 'backend'],
					},
					complete: true,
				},
			},
		};

		// Mock API to return our response
		(axios.get as jest.Mock).mockResolvedValueOnce(mockApiResponse);

		// Call the function
		const result = await getFieldValues('traces', 'service.name');

		// Verify the returned structure matches SuccessResponseV2 format
		expect(result).toEqual({
			httpStatusCode: 200,
			data: expect.objectContaining({
				values: expect.any(Object),
				normalizedValues: expect.any(Array),
				complete: true,
			}),
		});
	});
});
