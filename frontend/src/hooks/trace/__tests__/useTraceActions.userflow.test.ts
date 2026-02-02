import { renderHook, waitFor } from '@testing-library/react';
import ROUTES from 'constants/routes';

import { useTraceActions } from '../useTraceActions';

// Mock external dependencies
const mockRedirectWithQueryBuilderData = jest.fn();
const mockNotifications = {
	success: jest.fn(),
	error: jest.fn(),
};
const mockSetCopy = jest.fn();
const mockQueryClient = {
	fetchQuery: jest.fn(),
};

// Mock the hooks and dependencies
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => ({
		currentQuery: {
			builder: {
				queryData: [
					{
						aggregateOperator: 'count',
						aggregateAttribute: { key: 'signoz_span_duration' },
						filters: { items: [], op: 'AND' },
						filter: { expression: '' },
						groupBy: [],
					},
				],
			},
		},
		redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
	}),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({ notifications: mockNotifications }),
}));

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): any => [{ value: '' }, mockSetCopy],
}));

jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): any => mockQueryClient,
}));

// Mock the API response for getAggregateKeys
const mockAggregateKeysResponse = {
	payload: {
		attributeKeys: [
			{
				// eslint-disable-next-line sonarjs/no-duplicate-string
				key: 'http.method',
				dataType: 'string',
				type: 'tag',
				isColumn: true,
			},
		],
	},
};

beforeEach(() => {
	jest.clearAllMocks();
	mockQueryClient.fetchQuery.mockResolvedValue(mockAggregateKeysResponse);
});

describe('useTraceActions Hook User Flow Tests', () => {
	it('should handle copy field name action', async () => {
		const { result } = renderHook(() => useTraceActions());

		// Test copying field name
		result.current.onCopyFieldName('http.method');

		// Verify clipboard and notification
		expect(mockSetCopy).toHaveBeenCalledWith('http.method');
		expect(mockNotifications.success).toHaveBeenCalledWith({
			message: 'Field name copied to clipboard',
		});
	});

	it('should handle copy field value action', async () => {
		const { result } = renderHook(() => useTraceActions());

		// Test copying field value
		result.current.onCopyFieldValue('GET');

		// Verify clipboard and notification
		expect(mockSetCopy).toHaveBeenCalledWith('GET');
		expect(mockNotifications.success).toHaveBeenCalledWith({
			message: 'Field value copied to clipboard',
		});
	});

	it('should handle copy field value with quoted strings', async () => {
		const { result } = renderHook(() => useTraceActions());

		// Test copying quoted field value (should remain as-is since hook doesn't strip quotes)
		result.current.onCopyFieldValue('"quoted_value"');

		// Verify clipboard contains the exact value passed
		expect(mockSetCopy).toHaveBeenCalledWith('"quoted_value"');
		expect(mockNotifications.success).toHaveBeenCalledWith({
			message: 'Field value copied to clipboard',
		});
	});

	it('should handle group by attribute action', async () => {
		const { result } = renderHook(() => useTraceActions());

		// Test group by action
		await result.current.onGroupByAttribute('http.method');

		// Verify navigation with groupBy applied
		await waitFor(() => {
			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								dataSource: 'traces',
								groupBy: expect.arrayContaining([
									expect.objectContaining({ key: 'http.method' }),
								]),
							}),
						]),
					}),
				}),
				{},
				ROUTES.TRACES_EXPLORER,
			);
		});
	});

	it('should handle filter actions with proper query building', async () => {
		const { result } = renderHook(() => useTraceActions());

		// Test inclusive filter
		await result.current.onAddToQuery('http.method', 'GET', '=');

		// Verify navigation to traces explorer with inclusive filter
		await waitFor(() => {
			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								dataSource: 'traces',
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({ key: 'http.method' }),
											op: '=',
											value: 'GET',
										}),
									]),
								}),
							}),
						]),
					}),
				}),
				{},
				ROUTES.TRACES_EXPLORER,
			);
		});

		// Reset mock and test exclusive filter
		mockRedirectWithQueryBuilderData.mockClear();
		await result.current.onAddToQuery('http.method', 'POST', '!=');

		// Verify navigation to traces explorer with exclusive filter
		await waitFor(() => {
			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								dataSource: 'traces',
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({ key: 'http.method' }),
											op: '!=',
											value: 'POST',
										}),
									]),
								}),
							}),
						]),
					}),
				}),
				{},
				ROUTES.TRACES_EXPLORER,
			);
		});
	});

	it('should handle errors gracefully', async () => {
		// Mock API to throw error
		mockQueryClient.fetchQuery.mockRejectedValueOnce(new Error('API Error'));

		const { result } = renderHook(() => useTraceActions());

		// Test that error is handled properly
		await result.current.onAddToQuery('http.method', 'GET', '=');

		// Verify error notification is shown
		await waitFor(() => {
			expect(mockNotifications.error).toHaveBeenCalledWith({
				message: 'Something went wrong',
			});
		});
	});
});
