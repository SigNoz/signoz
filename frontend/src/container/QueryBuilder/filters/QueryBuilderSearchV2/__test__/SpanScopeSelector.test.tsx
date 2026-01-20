import {
	fireEvent,
	render,
	RenderResult,
	screen,
	within,
} from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
	IBuilderQuery,
	Query,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import QueryBuilderSearchV2 from '../QueryBuilderSearchV2';
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

const createNonScopeFilter = (key: string, value: string): TagFilterItem => ({
	id: `non-scope-${key}`,
	key: { key, type: 'tag' },
	op: '=',
	value,
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

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

const defaultQueryBuilderQuery: IBuilderQuery = {
	...initialQueriesMap.traces.builder.queryData[0],
	queryName: 'A',
	filters: { items: [], op: 'AND' },
};

// Helper to create query with filters
const createQueryWithFilters = (filters: TagFilterItem[]): Query => ({
	...defaultQuery,
	builder: {
		...defaultQuery.builder,
		queryData: [
			{
				...defaultQuery.builder.queryData[0],
				queryName: 'A',
				filters: {
					items: filters,
					op: 'AND',
				},
			},
		],
	},
});

const renderWithContext = (
	initialQuery = defaultQuery,
	onChangeProp?: (value: TagFilter) => void,
	queryProp?: IBuilderQuery,
	skipQueryBuilderRedirect = false,
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
			<SpanScopeSelector
				onChange={onChangeProp}
				query={queryProp}
				skipQueryBuilderRedirect={skipQueryBuilderRedirect}
			/>
		</QueryBuilderContext.Provider>,
	);

const selectOption = async (optionText: string): Promise<void> => {
	const selector = within(screen.getByTestId('span-scope-selector')).getByRole(
		'combobox',
	);

	fireEvent.mouseDown(selector);

	// Wait for dropdown to appear
	await screen.findByRole('listbox');

	// Find the option by its content text and click it
	const option = await screen.findByText(optionText, {
		selector: '.ant-select-item-option-content',
	});
	fireEvent.click(option);
};

describe('SpanScopeSelector', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render with default ALL_SPANS selected', () => {
		renderWithContext();
		expect(screen.getByText('All Spans')).toBeInTheDocument();
	});

	describe('when selecting different options', () => {
		const assertFilterAdded = (
			updatedQuery: Query,
			expectedKey: string,
		): void => {
			const filters = updatedQuery.builder.queryData[0].filters?.items || [];
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

		it('should remove span scope filters when selecting ALL_SPANS', async () => {
			const queryWithSpanScope = createQueryWithFilters([
				createSpanScopeFilter('isRoot'),
			]);
			renderWithContext(queryWithSpanScope, undefined, defaultQueryBuilderQuery);

			await selectOption('All Spans');

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
			renderWithContext(defaultQuery, undefined, defaultQueryBuilderQuery);
			// eslint-disable-next-line sonarjs/no-duplicate-string
			await selectOption('Root Spans');

			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalled();
			assertFilterAdded(
				mockRedirectWithQueryBuilderData.mock.calls[0][0],
				'isRoot',
			);
		});

		it('should add isEntryPoint filter when selecting ENTRYPOINT_SPANS', async () => {
			renderWithContext(defaultQuery, undefined, defaultQueryBuilderQuery);
			// eslint-disable-next-line sonarjs/no-duplicate-string
			await selectOption('Entrypoint Spans');

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
				renderWithContext(queryWithFilter, undefined, defaultQueryBuilderQuery);
				expect(await screen.findByText(expectedText)).toBeInTheDocument();
			},
		);
	});

	describe('when onChange and query props are provided', () => {
		const mockOnChange = jest.fn();

		const createLocalQuery = (
			filterItems: TagFilterItem[] = [],
			op: 'AND' | 'OR' = 'AND',
		): IBuilderQuery => ({
			...defaultQueryBuilderQuery,
			filters: { items: filterItems, op },
		});

		const assertOnChangePayload = (
			callNumber: number, // To handle multiple calls if needed, usually 0 for single interaction
			expectedScopeKey: string | null,
			expectedNonScopeItems: TagFilterItem[] = [],
		): void => {
			expect(mockOnChange).toHaveBeenCalled();
			const onChangeArg = mockOnChange.mock.calls[callNumber][0] as TagFilter;
			const { items } = onChangeArg;

			// Check for preservation of specific non-scope items
			expectedNonScopeItems.forEach((nonScopeItem) => {
				expect(items).toContainEqual(nonScopeItem);
			});

			const scopeFiltersInPayload = items.filter(
				(filter) => filter.key?.type === 'spanSearchScope',
			);

			if (expectedScopeKey) {
				expect(scopeFiltersInPayload.length).toBe(1);
				expect(scopeFiltersInPayload[0].key?.key).toBe(expectedScopeKey);
				expect(scopeFiltersInPayload[0].value).toBe('true');
				expect(scopeFiltersInPayload[0].op).toBe('=');
			} else {
				expect(scopeFiltersInPayload.length).toBe(0);
			}

			const expectedTotalFilters =
				expectedNonScopeItems.length + (expectedScopeKey ? 1 : 0);
			expect(items.length).toBe(expectedTotalFilters);
		};

		beforeEach(() => {
			mockOnChange.mockClear();
			mockRedirectWithQueryBuilderData.mockClear();
		});

		it('should initialize with ALL_SPANS if query prop has no scope filters', async () => {
			const localQuery = createLocalQuery();
			renderWithContext(defaultQuery, mockOnChange, localQuery);
			expect(await screen.findByText('All Spans')).toBeInTheDocument();
		});

		it('should initialize with ROOT_SPANS if query prop has isRoot filter', async () => {
			const localQuery = createLocalQuery([createSpanScopeFilter('isRoot')]);
			renderWithContext(defaultQuery, mockOnChange, localQuery);
			expect(await screen.findByText('Root Spans')).toBeInTheDocument();
		});

		it('should initialize with ENTRYPOINT_SPANS if query prop has isEntryPoint filter', async () => {
			const localQuery = createLocalQuery([createSpanScopeFilter('isEntryPoint')]);
			renderWithContext(defaultQuery, mockOnChange, localQuery);
			expect(await screen.findByText('Entrypoint Spans')).toBeInTheDocument();
		});

		it('should call onChange and not redirect when selecting ROOT_SPANS (from ALL_SPANS)', async () => {
			const localQuery = createLocalQuery(); // Initially All Spans
			const { container } = renderWithContext(
				defaultQuery,
				mockOnChange,
				localQuery,
				true,
			);
			expect(await screen.findByText('All Spans')).toBeInTheDocument();

			await selectOption('Root Spans');

			expect(mockRedirectWithQueryBuilderData).not.toHaveBeenCalled();
			assertOnChangePayload(0, 'isRoot', []);
			expect(
				container.querySelector('span[title="Root Spans"]'),
			).toBeInTheDocument();
		});

		it('should call onChange with removed scope when selecting ALL_SPANS (from ROOT_SPANS)', async () => {
			const initialRootFilter = createSpanScopeFilter('isRoot');
			const localQuery = createLocalQuery([initialRootFilter]);
			const { container } = renderWithContext(
				defaultQuery,
				mockOnChange,
				localQuery,
				true,
			);
			expect(await screen.findByText('Root Spans')).toBeInTheDocument();

			await selectOption('All Spans');

			expect(mockRedirectWithQueryBuilderData).not.toHaveBeenCalled();
			assertOnChangePayload(0, null, []);

			expect(
				container.querySelector('span[title="All Spans"]'),
			).toBeInTheDocument();
		});

		it('should call onChange, replacing isRoot with isEntryPoint', async () => {
			const initialRootFilter = createSpanScopeFilter('isRoot');
			const localQuery = createLocalQuery([initialRootFilter]);
			const { container } = renderWithContext(
				defaultQuery,
				mockOnChange,
				localQuery,
				true,
			);
			expect(await screen.findByText('Root Spans')).toBeInTheDocument();

			await selectOption('Entrypoint Spans');

			expect(mockRedirectWithQueryBuilderData).not.toHaveBeenCalled();
			assertOnChangePayload(0, 'isEntryPoint', []);
			expect(
				container.querySelector('span[title="Entrypoint Spans"]'),
			).toBeInTheDocument();
		});

		it('should preserve non-scope filters from query prop when changing scope', async () => {
			const nonScopeItem = createNonScopeFilter('customTag', 'customValue');
			const initialRootFilter = createSpanScopeFilter('isRoot');
			const localQuery = createLocalQuery([nonScopeItem, initialRootFilter], 'OR');

			const { container } = renderWithContext(
				defaultQuery,
				mockOnChange,
				localQuery,
				true,
			);
			expect(await screen.findByText('Root Spans')).toBeInTheDocument();

			await selectOption('Entrypoint Spans');

			expect(mockRedirectWithQueryBuilderData).not.toHaveBeenCalled();
			assertOnChangePayload(0, 'isEntryPoint', [nonScopeItem]);
			expect(
				container.querySelector('span[title="Entrypoint Spans"]'),
			).toBeInTheDocument();
		});

		it('should preserve non-scope filters when changing to ALL_SPANS', async () => {
			const nonScopeItem1 = createNonScopeFilter('service', 'checkout');
			const nonScopeItem2 = createNonScopeFilter('version', 'v1');
			const initialEntryFilter = createSpanScopeFilter('isEntryPoint');
			const localQuery = createLocalQuery([
				nonScopeItem1,
				initialEntryFilter,
				nonScopeItem2,
			]);

			const { container } = renderWithContext(
				defaultQuery,
				mockOnChange,
				localQuery,
				true,
			);
			expect(await screen.findByText('Entrypoint Spans')).toBeInTheDocument();

			await selectOption('All Spans');

			expect(mockRedirectWithQueryBuilderData).not.toHaveBeenCalled();
			assertOnChangePayload(0, null, [nonScopeItem1, nonScopeItem2]);
			expect(
				container.querySelector('span[title="All Spans"]'),
			).toBeInTheDocument();
		});

		it('should not duplicate non-scope filters when changing span scope', async () => {
			const query = {
				...defaultQuery,
				builder: {
					...defaultQuery.builder,
					queryData: [
						{
							...defaultQuery.builder.queryData[0],
							filters: {
								items: [createNonScopeFilter('service', 'checkout')],
								op: 'AND',
							},
						},
					],
				},
			};
			render(
				<QueryClientProvider client={queryClient}>
					<QueryBuilderContext.Provider
						value={
							{
								currentQuery: query,
								redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
							} as any
						}
					>
						<QueryBuilderSearchV2
							query={query.builder.queryData[0] as any}
							onChange={mockOnChange}
							hideSpanScopeSelector={false}
						/>
					</QueryBuilderContext.Provider>
				</QueryClientProvider>,
			);

			expect(await screen.findByText('All Spans')).toBeInTheDocument();

			await selectOption('Entrypoint Spans');

			expect(mockRedirectWithQueryBuilderData).toHaveBeenCalled();

			const redirectQueryArg = mockRedirectWithQueryBuilderData.mock
				.calls[0][0] as Query;
			const { items } = redirectQueryArg.builder.queryData[0].filters || {
				items: [],
			};
			// Count non-scope filters
			const nonScopeFilters = items.filter(
				(filter) => filter.key?.type !== 'spanSearchScope',
			);
			expect(nonScopeFilters).toHaveLength(1);

			expect(nonScopeFilters).toContainEqual(
				createNonScopeFilter('service', 'checkout'),
			);
		});
	});
});
