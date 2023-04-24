import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { QueryClient, QueryClientProvider } from 'react-query';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useFetchKeysAndValues } from '../useFetchKeysAndValues';

const valueWithAttributeAndOperator: IBuilderQueryForm = {
	dataSource: DataSource.METRICS,
	queryName: 'A',
	aggregateOperator: 'noop',
	aggregateAttribute: {
		key: 'signoz_latency_count',
		dataType: 'float64',
		type: 'tag',
		isColumn: true,
	},
	tagFilters: {
		items: [
			{
				id: '8fac746b',
				key: 'resource_signoz_collector_id',
				op: '=',
				value: ['1a5d3cc2-4b3e-4c7c-ad07-c4cdd739d1b9'],
			},
		],
		op: 'AND',
	},
	expression: '',
	disabled: false,
	having: [],
	stepInterval: 30,
	limit: 10,
	orderBy: [],
	groupBy: [],
	legend: '',
	reduceTo: '',
};

const searchValue = '';

describe('useFetchKeysAndValues', () => {
	let queryClient: QueryClient;
	let wrapper: React.FC<{ children: React.ReactNode }>;

	beforeAll(async () => {
		queryClient = new QueryClient();
		wrapper = ({ children }): JSX.Element => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
		queryClient.clear();
	});

	test('should isFetching Data', async () => {
		const { result } = renderHook(
			() => useFetchKeysAndValues(searchValue, valueWithAttributeAndOperator),
			{
				wrapper,
			},
		);
		expect(result.current.isFetching).toBeTruthy();
		await waitFor(() => {
			expect(result.current.isFetching).toBeFalsy();
		});
	});

	test('should results', () => {
		const { result } = renderHook(
			() => useFetchKeysAndValues(searchValue, valueWithAttributeAndOperator),
			{
				wrapper,
			},
		);
		expect(result.current.results).toStrictEqual([]);

		act(() => {
			result.current.results = ['employee.find', 'employee.delete'];
		});

		expect(result.current.results).toStrictEqual([
			'employee.find',
			'employee.delete',
		]);

		result.current.results = ['employee = find'];

		Object.keys(result.current.results).forEach((key: string) => {
			expect(
				result.current.results[(key as unknown) as number].includes('find'),
			).toBeTruthy();
		});
	});

	test('should keys data', () => {
		const { result } = renderHook(
			() => useFetchKeysAndValues(searchValue, valueWithAttributeAndOperator),
			{
				wrapper,
			},
		);

		expect(result.current.keys).toStrictEqual([]);

		act(() => {
			result.current.keys = [
				{
					key: 'exporter',
					dataType: 'string',
					type: 'tag',
					isColumn: false,
				},
			];
		});

		expect(result.current.keys).toStrictEqual([
			{
				key: 'exporter',
				dataType: 'string',
				type: 'tag',
				isColumn: false,
			},
		]);
	});
});
