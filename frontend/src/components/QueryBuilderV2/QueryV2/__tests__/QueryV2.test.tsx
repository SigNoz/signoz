/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react/display-name */
import { jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { render, screen, userEvent } from 'tests/test-utils';
import {
	Having,
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { UseQueryOperations } from 'types/common/operations.types';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import '@testing-library/jest-dom';

import { QueryBuilderV2 } from '../../QueryBuilderV2';

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

describe('QueryBuilderV2 + QueryV2 - base render', () => {
	let handleRunQueryMock: jest.MockedFunction<() => void>;

	beforeEach(() => {
		const mockCloneQuery = jest.fn() as jest.MockedFunction<
			(type: string, q: IBuilderQuery) => void
		>;
		handleRunQueryMock = jest.fn() as jest.MockedFunction<() => void>;
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

		const currentQueryObj: Query = {
			id: 'test',
			unit: undefined,
			queryType: EQueryType.CLICKHOUSE,
			promql: [],
			clickhouse_sql: [],
			builder: {
				queryData: [baseQuery],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		};

		const updateAllQueriesOperators: QueryBuilderContextType['updateAllQueriesOperators'] = (
			q,
		) => q;
		const updateQueriesData: QueryBuilderContextType['updateQueriesData'] = (q) =>
			q;

		mockedUseQueryBuilder.mockReturnValue(({
			currentQuery: currentQueryObj,
			stagedQuery: null,
			lastUsedQuery: null,
			setLastUsedQuery: jest.fn(),
			supersetQuery: currentQueryObj,
			setSupersetQuery: jest.fn(),
			initialDataSource: null,
			panelType: PANEL_TYPES.TABLE,
			isEnabledQuery: true,
			handleSetQueryData: jest.fn(),
			handleSetTraceOperatorData: jest.fn(),
			handleSetFormulaData: jest.fn(),
			handleSetQueryItemData: jest.fn(),
			handleSetConfig: jest.fn(),
			removeQueryBuilderEntityByIndex: jest.fn(),
			removeAllQueryBuilderEntities: jest.fn(),
			removeQueryTypeItemByIndex: jest.fn(),
			addNewBuilderQuery: jest.fn(),
			addNewFormula: jest.fn(),
			removeTraceOperator: jest.fn(),
			addTraceOperator: jest.fn(),
			cloneQuery: mockCloneQuery,
			addNewQueryItem: jest.fn(),
			redirectWithQueryBuilderData: jest.fn(),
			handleRunQuery: handleRunQueryMock,
			resetQuery: jest.fn(),
			handleOnUnitsChange: jest.fn(),
			updateAllQueriesOperators,
			updateQueriesData,
			initQueryBuilderData: jest.fn(),
			isStagedQueryUpdated: jest.fn(() => false),
			isDefaultQuery: jest.fn(() => false),
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
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		// Ensure the Limit add-on input is present and is of type number
		const limitInput = screen.getByPlaceholderText(
			'Enter limit',
		) as HTMLInputElement;
		expect(limitInput).toBeInTheDocument();
		expect(limitInput).toHaveAttribute('type', 'number');
		expect(limitInput).toHaveAttribute('name', 'limit');
		expect(limitInput).toHaveAttribute('data-testid', 'input-Limit');
	});

	it('Cmd+Enter on an input triggers handleRunQuery via container handler', async () => {
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		const limitInput = screen.getByPlaceholderText('Enter limit');
		fireEvent.keyDown(limitInput, {
			key: 'Enter',
			code: 'Enter',
			metaKey: true,
		});

		expect(handleRunQueryMock).toHaveBeenCalled();

		const legendInput = screen.getByPlaceholderText('Write legend format');
		fireEvent.keyDown(legendInput, {
			key: 'Enter',
			code: 'Enter',
			metaKey: true,
		});

		expect(handleRunQueryMock).toHaveBeenCalled();

		const CM_EDITOR_SELECTOR = '.cm-editor .cm-content';
		// Wait for CodeMirror to initialize
		await waitFor(() => {
			const editor = document.querySelector(CM_EDITOR_SELECTOR);
			expect(editor).toBeInTheDocument();
		});

		const editor = document.querySelector(CM_EDITOR_SELECTOR) as HTMLElement;
		await userEvent.click(editor);
		fireEvent.keyDown(editor, {
			key: 'Enter',
			code: 'Enter',
			metaKey: true,
		});

		expect(handleRunQueryMock).toHaveBeenCalled();
	});
});
