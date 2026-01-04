/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react/display-name */
import '@testing-library/jest-dom';

import { jest } from '@jest/globals';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { render, screen } from 'tests/test-utils';
import { Having, IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { UseQueryOperations } from 'types/common/operations.types';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import { QueryV2 } from '../QueryV2';

// Local mocks for domain-specific heavy child components
jest.mock(
	'../QueryAggregation/QueryAggregation',
	() =>
		function () {
			return <div>QueryAggregation</div>;
		},
);
jest.mock(
	'../MerticsAggregateSection/MetricsAggregateSection',
	() =>
		function () {
			return <div>MetricsAggregateSection</div>;
		},
);
// Mock hooks
jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('hooks/queryBuilder/useQueryBuilderOperations');

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);
const mockedUseQueryOperations = jest.mocked(
	useQueryOperations,
) as jest.MockedFunction<UseQueryOperations>;

describe('QueryV2 - base render', () => {
	beforeEach(() => {
		const mockCloneQuery = jest.fn() as jest.MockedFunction<
			(type: string, q: IBuilderQuery) => void
		>;

		mockedUseQueryBuilder.mockReturnValue(({
			// Only fields used by QueryV2
			cloneQuery: mockCloneQuery,
			panelType: null,
		} as unknown) as QueryBuilderContextType);

		mockedUseQueryOperations.mockReturnValue({
			isTracePanelType: false,
			isMetricsDataSource: false,
			operators: [],
			spaceAggregationOptions: [],
			listOfAdditionalFilters: [],
			handleChangeOperator: jest.fn(),
			handleSpaceAggregationChange: jest.fn(),
			handleChangeAggregatorAttribute: jest.fn(),
			handleChangeDataSource: jest.fn(),
			handleDeleteQuery: jest.fn(),
			handleChangeQueryData: (jest.fn() as unknown) as ReturnType<UseQueryOperations>['handleChangeQueryData'],
			handleChangeFormulaData: jest.fn(),
			handleQueryFunctionsUpdates: jest.fn(),
			listOfAdditionalFormulaFilters: [],
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders limit input when dataSource is logs', () => {
		const baseQuery: IBuilderQuery = {
			queryName: 'A',
			dataSource: DataSource.LOGS,
			aggregateOperator: '',
			aggregations: [],
			timeAggregation: '',
			spaceAggregation: '',
			temporality: '',
			functions: [],
			filter: undefined,
			filters: { items: [], op: 'AND' },
			groupBy: [],
			expression: '',
			disabled: false,
			having: [] as Having[],
			limit: 10,
			stepInterval: null,
			orderBy: [],
			legend: 'A',
		};

		render(
			<QueryV2
				index={0}
				isAvailableToDisable
				query={baseQuery}
				version="v4"
				onSignalSourceChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				signalSourceChangeEnabled={false}
				queriesCount={1}
				showTraceOperator={false}
				hasTraceOperator={false}
			/>,
		);

		// Ensure the Limit add-on input is present and is of type number
		const limitInput = screen.getByPlaceholderText(
			'Enter limit',
		) as HTMLInputElement;
		expect(limitInput).toBeInTheDocument();
		expect(limitInput).toHaveAttribute('type', 'number');
		expect(limitInput).toHaveAttribute('name', 'limit');
		expect(limitInput).toHaveAttribute('data-testid', 'input-Limit');
	});
});
