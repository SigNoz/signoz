/* eslint-disable react/jsx-props-no-spreading */
import {
	act,
	fireEvent,
	render,
	RenderResult,
	screen,
} from '@testing-library/react';
import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { QueryClient, QueryClientProvider } from 'react-query';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import QueryBuilderSearchV2 from '../QueryBuilderSearchV2';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

describe('Span scope selector', () => {
	it('should render span scope selector when hideSpanScopeSelector is false', () => {
		const { getByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<QueryBuilderSearchV2
					query={{
						...initialQueryBuilderFormValues,
						dataSource: DataSource.TRACES,
					}}
					hideSpanScopeSelector={false}
					onChange={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		expect(getByTestId('span-scope-selector')).toBeInTheDocument();
	});

	it('should not render span scope selector by default (i.e. when hideSpanScopeSelector is true)', () => {
		const { queryByTestId } = render(
			<QueryClientProvider client={queryClient}>
				<QueryBuilderSearchV2
					query={{
						...initialQueryBuilderFormValues,
						dataSource: DataSource.METRICS,
					}}
					onChange={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		expect(queryByTestId('span-scope-selector')).not.toBeInTheDocument();
	});
});

const mockOnChange = jest.fn();
const mockHandleRunQuery = jest.fn();
const defaultProps = {
	query: {
		...initialQueriesMap.traces.builder.queryData[0],
		dataSource: DataSource.TRACES,
		queryName: 'traces_query',
	},
	onChange: mockOnChange,
};

const renderWithContext = (props = {}): RenderResult => {
	const mergedProps = { ...defaultProps, ...props };

	return render(
		<QueryClientProvider client={queryClient}>
			<QueryBuilderContext.Provider
				value={
					{
						currentQuery: initialQueriesMap.traces,
						handleRunQuery: mockHandleRunQuery,
					} as any
				}
			>
				<QueryBuilderSearchV2 {...mergedProps} />
			</QueryBuilderContext.Provider>
		</QueryClientProvider>,
	);
};

const mockAggregateKeysData = {
	payload: {
		attributeKeys: [
			{
				// eslint-disable-next-line sonarjs/no-duplicate-string
				key: 'http.status',
				dataType: DataTypes.String,
				type: 'tag',
				isColumn: false,
				isJSON: false,
				id: 'http.status--string--tag--false',
			},
		],
	},
};

jest.mock('hooks/queryBuilder/useGetAggregateKeys', () => ({
	useGetAggregateKeys: jest.fn(() => ({
		data: mockAggregateKeysData,
		isFetching: false,
	})),
}));

const mockAggregateValuesData = {
	payload: {
		stringAttributeValues: ['200', '404', '500'],
		numberAttributeValues: [200, 404, 500],
	},
};

jest.mock('hooks/queryBuilder/useGetAggregateValues', () => ({
	useGetAggregateValues: jest.fn(() => ({
		data: mockAggregateValuesData,
		isFetching: false,
	})),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('Suggestion Key -> Operator -> Value Flow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	it('should complete full flow from key selection to value', async () => {
		const { container } = renderWithContext();

		// Get the combobox input specifically
		const combobox = container.querySelector(
			'.query-builder-search-v2 .ant-select-selection-search-input',
		) as HTMLInputElement;

		// 1. Focus and type to trigger key suggestions
		await act(async () => {
			fireEvent.focus(combobox);
			fireEvent.change(combobox, { target: { value: 'http.' } });
		});

		// Wait for dropdown to appear
		await screen.findByRole('listbox');

		// 2. Select a key from suggestions
		const statusOption = await screen.findByText('http.status');
		await act(async () => {
			fireEvent.click(statusOption);
		});

		// Should show operator suggestions
		expect(screen.getByText('=')).toBeInTheDocument();
		expect(screen.getByText('!=')).toBeInTheDocument();

		// 3. Select an operator
		const equalsOption = screen.getByText('=');
		await act(async () => {
			fireEvent.click(equalsOption);
		});

		// Should show value suggestions
		expect(screen.getByText('200')).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText('500')).toBeInTheDocument();

		// 4. Select a value
		const valueOption = screen.getByText('200');
		await act(async () => {
			fireEvent.click(valueOption);
		});

		// Verify final filter
		expect(mockOnChange).toHaveBeenCalledWith(
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: 'http.status' }),
						op: '=',
						value: '200',
					}),
				]),
			}),
		);
	});
});
