import { QueryClient, QueryClientProvider } from 'react-query';
import { render, RenderResult, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
} from 'constants/queryBuilder';
import { DynamicVariableSuggestion } from 'providers/Dashboard/store/dynamicVariableSuggestions';
import { QueryBuilderContext } from 'providers/QueryBuilder';
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

const getSearchCombobox = (): HTMLElement =>
	within(screen.getByTestId('qb-search-select')).getByRole('combobox');

// Constants to fix linter errors
const TYPE_TAG = 'tag';
const IS_COLUMN_FALSE = false;
const IS_JSON_FALSE = false;

const mockAggregateKeysData = {
	payload: {
		attributeKeys: [
			{
				key: 'http.status',
				dataType: DataTypes.String,
				type: TYPE_TAG,
				id: 'http.status--string--tag--false',
			},
			{
				key: 'service.name',
				dataType: DataTypes.String,
				type: TYPE_TAG,
				isColumn: IS_COLUMN_FALSE,
				isJSON: IS_JSON_FALSE,
				id: 'service.name--string--tag--false',
			},
			{
				key: 'unmapped.attribute',
				dataType: 'not-a-real-data-type' as unknown as DataTypes,
				type: TYPE_TAG,
				isColumn: IS_COLUMN_FALSE,
				isJSON: IS_JSON_FALSE,
				id: 'unmapped.attribute--String--tag--false',
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

// Mock the dynamic variables the open dashboard would publish
const dynamicVariableSuggestions = [
	{ name: 'service', attribute: 'service.name' },
];

jest.mock('hooks/dashboard/useDynamicVariableSuggestions', () => ({
	useDynamicVariableSuggestions: (): DynamicVariableSuggestion[] =>
		dynamicVariableSuggestions,
}));

describe('Suggestion Key -> Operator -> Value Flow', () => {
	it('should complete full flow from key selection to value', async () => {
		const user = userEvent.setup({ delay: null });
		renderWithContext();

		const combobox = getSearchCombobox();

		// 1. Focus and type to trigger key suggestions
		await user.click(combobox);
		await user.type(combobox, 'http.');

		// Wait for dropdown to appear
		await screen.findByRole('listbox');

		// 2. Select a key from suggestions
		await user.click(await screen.findByText('http.status'));

		// Should show operator suggestions
		expect(screen.getByText('=')).toBeInTheDocument();
		expect(screen.getByText('!=')).toBeInTheDocument();

		// 3. Select an operator
		await user.click(screen.getByText('='));

		// Should show value suggestions
		expect(screen.getByText('200')).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText('500')).toBeInTheDocument();

		// 4. Select a value
		await user.click(screen.getByText('200'));

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

describe('Operator suggestions for data types missing from the operators map', () => {
	it('should fall back to universal operators for a non-canonical data type', async () => {
		const user = userEvent.setup({ delay: null });
		renderWithContext();

		const combobox = getSearchCombobox();

		await user.click(combobox);
		await user.type(combobox, 'unmapped.');

		await screen.findByRole('listbox');

		await user.click(await screen.findByText('unmapped.attribute'));

		expect(screen.getByText('=')).toBeInTheDocument();
		expect(screen.getByText('!=')).toBeInTheDocument();
		expect(screen.getByText('>')).toBeInTheDocument();
		expect(screen.getByText('<')).toBeInTheDocument();

		expect(screen.queryByText('REGEX')).not.toBeInTheDocument();

		await user.click(screen.getByText('='));

		expect(combobox).toHaveDisplayValue(/unmapped\.attribute =/);
	});
});

describe('Dynamic Variable Suggestions', () => {
	it('should suggest dynamic variable when key matches a variable attribute', async () => {
		const user = userEvent.setup({ delay: null });
		renderWithContext();

		const combobox = getSearchCombobox();

		// Focus and type to trigger key suggestions for service.name
		await user.click(combobox);
		await user.type(combobox, 'service.');

		// Wait for dropdown to appear
		await screen.findByRole('listbox');

		// Select service.name key from suggestions
		await user.click(await screen.findByText('service.name'));

		// Select equals operator
		await user.click(screen.getByText('='));

		// Should show value suggestions including the dynamic variable
		// For 'service.name', we expect to see '$service' as the first suggestion
		const variableSuggestion = await screen.findByText('$service');
		expect(variableSuggestion).toBeInTheDocument();

		// Regular values should still be shown
		expect(screen.getByText('200')).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();

		// Select the variable suggestion
		await user.click(variableSuggestion);

		// Verify the query was updated with the variable as value
		expect(mockOnChange).toHaveBeenCalledWith(
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: 'service.name' }),
						op: '=',
						value: '$service',
					}),
				]),
			}),
		);
	});
});
