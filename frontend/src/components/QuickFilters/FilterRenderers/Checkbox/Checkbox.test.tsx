import { FiltersType, QuickFiltersSource } from 'components/QuickFilters/types';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryKeyValueSuggestions } from 'hooks/querySuggestions/useGetQueryKeyValueSuggestions';
import { quickFiltersAttributeValuesResponse } from 'mocks-server/__mockdata__/customQuickFilters';
import { rest, server } from 'mocks-server/server';
import { UseQueryResult } from 'react-query';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { SuccessResponse } from 'types/api';
import { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import CheckboxFilter from './Checkbox';

// Mock the query builder hook
jest.mock('hooks/queryBuilder/useQueryBuilder');
const mockUseQueryBuilder = jest.mocked(useQueryBuilder);

// Mock the aggregate values hook
jest.mock('hooks/queryBuilder/useGetAggregateValues');

const mockUseGetAggregateValues = jest.mocked(useGetAggregateValues);

// Mock the key value suggestions hook
jest.mock('hooks/querySuggestions/useGetQueryKeyValueSuggestions');

const mockUseGetQueryKeyValueSuggestions = jest.mocked(
	useGetQueryKeyValueSuggestions,
);

interface MockFilterConfig {
	title: string;
	attributeKey: {
		key: string;
		dataType: DataTypes;
		type: string;
	};
	dataSource: DataSource;
	defaultOpen: boolean;
	type: FiltersType;
}

const createMockFilter = (
	overrides: Partial<MockFilterConfig> = {},
): MockFilterConfig => ({
	// eslint-disable-next-line sonarjs/no-duplicate-string
	title: 'Service Name',
	attributeKey: {
		key: 'service.name',
		dataType: DataTypes.String,
		type: 'resource',
	},
	dataSource: DataSource.LOGS,
	defaultOpen: false,
	type: FiltersType.CHECKBOX,
	...overrides,
});

const createMockQueryBuilderData = (hasActiveFilters = false): any => ({
	lastUsedQuery: 0,
	currentQuery: {
		builder: {
			queryData: [
				{
					filters: {
						items: hasActiveFilters
							? [
									{
										key: {
											key: 'service.name',
											dataType: DataTypes.String,
											type: 'resource',
										},
										op: 'in',
										value: ['otel-demo', 'sample-flask'],
									},
							  ]
							: [],
					},
				},
			],
		},
	},
	redirectWithQueryBuilderData: jest.fn(),
});

describe('CheckboxFilter - User Flows', () => {
	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Default mock implementations using the same structure as existing tests
		mockUseGetAggregateValues.mockReturnValue({
			data: {
				payload: {
					stringAttributeValues: [
						'mq-kafka',
						'otel-demo',
						'otlp-python',
						'sample-flask',
					],
				},
			},
			isLoading: false,
		} as UseQueryResult<SuccessResponse<IAttributeValuesResponse>>);

		mockUseGetQueryKeyValueSuggestions.mockReturnValue({
			data: null,
			isLoading: false,
		} as any);

		// Setup MSW server for API calls
		server.use(
			rest.get('*/api/v3/autocomplete/attribute_values', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(quickFiltersAttributeValuesResponse)),
			),
		);
	});

	it('should auto-open filter and prioritize checked items with visual separator when user opens page with active filters', async () => {
		// Mock query builder with active filters
		mockUseQueryBuilder.mockReturnValue(createMockQueryBuilderData(true) as any);

		const mockFilter = createMockFilter({ defaultOpen: false });

		render(
			<CheckboxFilter
				filter={mockFilter}
				source={QuickFiltersSource.LOGS_EXPLORER}
			/>,
		);

		// User should see the filter is automatically opened (not collapsed)
		expect(screen.getByText('Service Name')).toBeInTheDocument();
		await waitFor(() => {
			// eslint-disable-next-line sonarjs/no-duplicate-string
			expect(screen.getByPlaceholderText('Filter values')).toBeInTheDocument();
		});

		// User should see visual separator between checked and unchecked items
		expect(screen.getByTestId('filter-separator')).toBeInTheDocument();

		// User should see checked items at the top
		await waitFor(() => {
			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(4); // Ensure we have exactly 4 checkboxes
			expect(checkboxes[0]).toBeChecked(); // otel-demo should be first and checked
			expect(checkboxes[1]).toBeChecked(); // sample-flask should be second and checked
			expect(checkboxes[2]).not.toBeChecked(); // mq-kafka should be unchecked
			expect(checkboxes[3]).not.toBeChecked(); // otlp-python should be unchecked
		});
	});

	it('should respect user preference when user manually toggles filter over auto-open behavior', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		// Mock query builder with active filters
		mockUseQueryBuilder.mockReturnValue(createMockQueryBuilderData(true) as any);

		const mockFilter = createMockFilter({ defaultOpen: false });

		render(
			<CheckboxFilter
				filter={mockFilter}
				source={QuickFiltersSource.LOGS_EXPLORER}
			/>,
		);

		// Initially auto-opened due to active filters
		await waitFor(() => {
			expect(screen.getByPlaceholderText('Filter values')).toBeInTheDocument();
		});

		// User manually closes the filter
		await user.click(screen.getByText('Service Name'));

		// User should see filter is now closed (respecting user preference)
		expect(
			screen.queryByPlaceholderText('Filter values'),
		).not.toBeInTheDocument();

		// User manually opens the filter again
		await user.click(screen.getByText('Service Name'));

		// User should see filter is now open (respecting user preference)
		await waitFor(() => {
			expect(screen.getByPlaceholderText('Filter values')).toBeInTheDocument();
		});
	});
});
