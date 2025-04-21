import {
	fireEvent,
	render,
	RenderResult,
	screen,
} from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import SpanScopeSelector from '../SpanScopeSelector';

const mockRedirectWithQueryBuilderData = jest.fn();

// Helper to create filter items
const createSpanScopeFilter = (key: string): TagFilterItem => ({
	id: 'span-filter',
	key: {
		key,
		type: 'spanSearchScope',
	},
	op: '=',
	value: 'true',
});

const defaultQuery = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: [
			{
				...initialQueriesMap.traces.builder.queryData[0],
				queryName: 'A',
			},
		],
	},
};

// Helper to create query with filters
const createQueryWithFilters = (filters: TagFilterItem[]): Query => ({
	...defaultQuery,
	builder: {
		...defaultQuery.builder,
		queryData: [
			{
				...defaultQuery.builder.queryData[0],
				filters: {
					items: filters,
					op: 'AND',
				},
			},
		],
	},
});

const renderWithContext = (
	queryName = 'A',
	initialQuery = defaultQuery,
): RenderResult =>
	render(
		<QueryBuilderContext.Provider
			value={
				{
					currentQuery: initialQuery,
					redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} as any
			}
		>
			<SpanScopeSelector queryName={queryName} />
		</QueryBuilderContext.Provider>,
	);

describe('SpanScopeSelector', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render with default ALL_SPANS selected', () => {
		renderWithContext();
		expect(screen.getByText('All Spans')).toBeInTheDocument();
	});

	describe('when selecting different options', () => {
		const selectOption = (optionText: string): void => {
			const selector = screen.getByRole('combobox');
			fireEvent.mouseDown(selector);
			const option = screen.getByText(optionText);
			fireEvent.click(option);
		};

		const assertFilterAdded = (
			updatedQuery: Query,
			expectedKey: string,
		): void => {
			const filters = updatedQuery.builder.queryData[0].filters.items;
			expect(filters).toContainEqual(
				expect.objectContaining({
					key: expect.objectContaining({
						key: expectedKey,
						type: 'spanSearchScope',
					}),
					op: '=',
					value: 'true',
				}),
			);
		};

		it('should remove span scope filters when selecting ALL_SPANS', () => {
			const queryWithSpanScope = createQueryWithFilters([
				createSpanScopeFilter('isRoot'),
			]);
			renderWithContext('A', queryWithSpanScope);

			selectOption('All Spans');

			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalled();
			const updatedQuery = mockRedirectWithQueryBuilderData.mock.calls[0][0];
			const filters = updatedQuery.builder.queryData[0].filters.items;
			expect(filters).not.toContainEqual(
				expect.objectContaining({
					key: expect.objectContaining({ type: 'spanSearchScope' }),
				}),
			);
		});

		it('should add isRoot filter when selecting ROOT_SPANS', async () => {
			renderWithContext();
			await selectOption('Root Spans');

			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalled();
			assertFilterAdded(
				mockRedirectWithQueryBuilderData.mock.calls[0][0],
				'isRoot',
			);
		});

		it('should add isEntryPoint filter when selecting ENTRYPOINT_SPANS', () => {
			renderWithContext();
			selectOption('Entrypoint Spans');

			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalled();
			assertFilterAdded(
				mockRedirectWithQueryBuilderData.mock.calls[0][0],
				'isEntryPoint',
			);
		});
	});

	describe('when initializing with existing filters', () => {
		it.each([
			['Root Spans', 'isRoot'],
			['Entrypoint Spans', 'isEntryPoint'],
		])(
			'should initialize with %s selected when %s filter exists',
			async (expectedText, filterKey) => {
				const queryWithFilter = createQueryWithFilters([
					createSpanScopeFilter(filterKey),
				]);
				renderWithContext('A', queryWithFilter);
				expect(await screen.findByText(expectedText)).toBeInTheDocument();
			},
		);
	});
});
