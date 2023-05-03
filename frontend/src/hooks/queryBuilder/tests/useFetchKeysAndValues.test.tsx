import { renderHook, waitFor } from '@testing-library/react';
import {
	querySearchResult,
	valueWithAttributeAndOperator,
} from 'container/QueryBuilder/mock/queryData';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useFetchKeysAndValues } from '../useFetchKeysAndValues';

const searchValue = '';

describe('useFetchKeysAndValues', () => {
	let queryClient: QueryClient;
	let wrapper: React.FC<{ children: React.ReactNode }>;

	beforeAll(() => {
		queryClient = new QueryClient();
		wrapper = ({ children }): JSX.Element => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	});

	test('should isFetching Data', () => {
		const { result } = renderHook(
			() => useFetchKeysAndValues(searchValue, valueWithAttributeAndOperator),
			{
				wrapper,
			},
		);
		expect(result.current.isFetching).toBeTruthy();
		waitFor(() => {
			expect(result.current.isFetching).toBeFalsy();
		});
	});

	test('should results', async () => {
		const { result } = renderHook(
			() => useFetchKeysAndValues(searchValue, valueWithAttributeAndOperator),
			{
				wrapper,
			},
		);
		expect(result.current.results).toStrictEqual([]);

		act(() => {
			result.current.results = querySearchResult;
		});

		expect(result.current.results).toStrictEqual(querySearchResult);

		result.current.results = ['employee = find'];

		await waitFor(() => {
			Object.keys(result.current.results).forEach((key: string) => {
				expect(
					result.current.results[(key as unknown) as number].includes('find'),
				).toBeTruthy();
			});
		});
	});

	test('should keys data', async () => {
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

		await waitFor(() => {
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
});
