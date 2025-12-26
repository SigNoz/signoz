import { renderHook } from '@testing-library/react';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import { useQueries } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';

import useOptionsMenu from '../useOptionsMenu';

// Mock all dependencies
jest.mock('hooks/useNotifications');
jest.mock('providers/preferences/context/PreferenceContextProvider');
jest.mock('hooks/useUrlQueryData');
jest.mock('hooks/querySuggestions/useGetQueryKeySuggestions');
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: jest.fn(),
}));

describe('useOptionsMenu', () => {
	const mockNotifications = { error: jest.fn(), success: jest.fn() };
	const mockUpdateColumns = jest.fn();
	const mockUpdateFormatting = jest.fn();
	const mockRedirectWithQuery = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		(useNotifications as jest.Mock).mockReturnValue({
			notifications: mockNotifications,
		});

		(usePreferenceContext as jest.Mock).mockReturnValue({
			traces: {
				preferences: {
					columns: [],
					formatting: {
						format: 'raw',
						maxLines: 1,
						fontSize: 'small',
					},
				},
				updateColumns: mockUpdateColumns,
				updateFormatting: mockUpdateFormatting,
			},
			logs: {
				preferences: {
					columns: [],
					formatting: {
						format: 'raw',
						maxLines: 1,
						fontSize: 'small',
					},
				},
				updateColumns: mockUpdateColumns,
				updateFormatting: mockUpdateFormatting,
			},
		});

		(useUrlQueryData as jest.Mock).mockReturnValue({
			query: null,
			redirectWithQuery: mockRedirectWithQuery,
		});

		(useQueries as jest.Mock).mockReturnValue([]);
	});

	it('does not show isRoot or isEntryPoint in column options when dataSource is TRACES', () => {
		// Mock the query key suggestions to return data including isRoot and isEntryPoint
		(useGetQueryKeySuggestions as jest.Mock).mockReturnValue({
			data: {
				data: {
					data: {
						keys: {
							attributeKeys: [
								{
									name: 'isRoot',
									signal: 'traces',
									fieldDataType: 'bool',
									fieldContext: '',
								},
								{
									name: 'isEntryPoint',
									signal: 'traces',
									fieldDataType: 'bool',
									fieldContext: '',
								},
								{
									name: 'duration',
									signal: 'traces',
									fieldDataType: 'float64',
									fieldContext: '',
								},
								{
									name: 'serviceName',
									signal: 'traces',
									fieldDataType: 'string',
									fieldContext: '',
								},
							],
						},
					},
				},
			},
			isFetching: false,
		});

		const { result } = renderHook(() =>
			useOptionsMenu({
				dataSource: DataSource.TRACES,
				aggregateOperator: 'count',
			}),
		);

		// Get the column options from the config
		const columnOptions = result.current.config.addColumn?.options ?? [];
		const optionNames = columnOptions.map((option) => option.label);

		// isRoot and isEntryPoint should NOT be in the options
		expect(optionNames).not.toContain('isRoot');
		expect(optionNames).not.toContain('body');
		expect(optionNames).not.toContain('isEntryPoint');

		// Other attributes should be present
		expect(optionNames).toContain('duration');
		expect(optionNames).toContain('serviceName');
	});

	it('does not show body in column options when dataSource is METRICS', () => {
		// Mock the query key suggestions to return data including body
		(useGetQueryKeySuggestions as jest.Mock).mockReturnValue({
			data: {
				data: {
					data: {
						keys: {
							attributeKeys: [
								{
									name: 'body',
									signal: 'logs',
									fieldDataType: 'string',
									fieldContext: '',
								},
								{
									name: 'status',
									signal: 'metrics',
									fieldDataType: 'int64',
									fieldContext: '',
								},
								{
									name: 'value',
									signal: 'metrics',
									fieldDataType: 'float64',
									fieldContext: '',
								},
							],
						},
					},
				},
			},
			isFetching: false,
		});

		const { result } = renderHook(() =>
			useOptionsMenu({
				dataSource: DataSource.METRICS,
				aggregateOperator: 'count',
			}),
		);

		// Get the column options from the config
		const columnOptions = result.current.config.addColumn?.options ?? [];
		const optionNames = columnOptions.map((option) => option.label);

		// body should NOT be in the options
		expect(optionNames).not.toContain('body');

		// Other attributes should be present
		expect(optionNames).toContain('status');
		expect(optionNames).toContain('value');
	});

	it('does not show body in column options when dataSource is LOGS', () => {
		// Mock the query key suggestions to return data including body
		(useGetQueryKeySuggestions as jest.Mock).mockReturnValue({
			data: {
				data: {
					data: {
						keys: {
							attributeKeys: [
								{
									name: 'body',
									signal: 'logs',
									fieldDataType: 'string',
									fieldContext: '',
								},
								{
									name: 'level',
									signal: 'logs',
									fieldDataType: 'string',
									fieldContext: '',
								},
								{
									name: 'timestamp',
									signal: 'logs',
									fieldDataType: 'int64',
									fieldContext: '',
								},
							],
						},
					},
				},
			},
			isFetching: false,
		});

		const { result } = renderHook(() =>
			useOptionsMenu({
				dataSource: DataSource.LOGS,
				aggregateOperator: 'count',
			}),
		);

		// Get the column options from the config
		const columnOptions = result.current.config.addColumn?.options ?? [];
		const optionNames = columnOptions.map((option) => option.label);

		// body should be in the options
		expect(optionNames).toContain('body');

		// Other attributes should be present
		expect(optionNames).toContain('level');
		expect(optionNames).toContain('timestamp');
	});
});
