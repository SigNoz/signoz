/* eslint-disable @typescript-eslint/explicit-function-return-type */
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
import { QueryFunction } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { UseQueryOperations } from 'types/common/operations.types';
import {
	DataSource,
	QueryBuilderContextType,
	QueryFunctionsTypes,
} from 'types/common/queryBuilder';
import type { MockedFunction } from 'vitest';

import '@testing-library/jest-dom';

import { QueryBuilderV2 } from '../../QueryBuilderV2';

// Local mocks for domain-specific heavy child components
vi.mock('../QueryAggregation/QueryAggregation', () => ({
	default: function QueryAggregation(): JSX.Element {
		return <div>QueryAggregation</div>;
	},
}));
vi.mock('../MerticsAggregateSection/MetricsAggregateSection', () => ({
	default: function MetricsAggregateSection(): JSX.Element {
		return <div>MetricsAggregateSection</div>;
	},
}));
// Mock hooks
vi.mock('hooks/queryBuilder/useQueryBuilder');
vi.mock('hooks/queryBuilder/useQueryBuilderOperations');

const mockedUseQueryBuilder = vi.mocked(useQueryBuilder);
const mockedUseQueryOperations = vi.mocked(
	useQueryOperations,
) as MockedFunction<UseQueryOperations>;

describe('QueryBuilderV2 + QueryV2 - base render', () => {
	let handleRunQueryMock: MockedFunction<() => void>;
	let handleQueryFunctionsUpdatesMock: MockedFunction<() => void>;
	let baseQBContext: QueryBuilderContextType;

	beforeEach(() => {
		const mockCloneQuery = vi.fn() as MockedFunction<
			(type: string, q: IBuilderQuery) => void
		>;
		handleRunQueryMock = vi.fn() as MockedFunction<() => void>;
		handleQueryFunctionsUpdatesMock = vi.fn() as MockedFunction<() => void>;
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

		const updateAllQueriesOperators: QueryBuilderContextType['updateAllQueriesOperators'] =
			(q) => q;
		const updateQueriesData: QueryBuilderContextType['updateQueriesData'] = (q) =>
			q;

		const baseContext = {
			currentQuery: currentQueryObj,
			stagedQuery: null,
			lastUsedQuery: null,
			setLastUsedQuery: vi.fn(),
			supersetQuery: currentQueryObj,
			setSupersetQuery: vi.fn(),
			initialDataSource: null,
			panelType: PANEL_TYPES.TABLE,
			isEnabledQuery: true,
			handleSetQueryData: vi.fn(),
			handleSetTraceOperatorData: vi.fn(),
			handleSetFormulaData: vi.fn(),
			handleSetQueryItemData: vi.fn(),
			handleSetConfig: vi.fn(),
			removeQueryBuilderEntityByIndex: vi.fn(),
			removeAllQueryBuilderEntities: vi.fn(),
			removeQueryTypeItemByIndex: vi.fn(),
			addNewBuilderQuery: vi.fn(),
			addNewFormula: vi.fn(),
			removeTraceOperator: vi.fn(),
			addTraceOperator: vi.fn(),
			cloneQuery: mockCloneQuery,
			addNewQueryItem: vi.fn(),
			redirectWithQueryBuilderData: vi.fn(),
			handleRunQuery: handleRunQueryMock,
			resetQuery: vi.fn(),
			handleOnUnitsChange: vi.fn(),
			updateAllQueriesOperators,
			updateQueriesData,
			initQueryBuilderData: vi.fn(),
			isStagedQueryUpdated: vi.fn(() => false),
			isDefaultQuery: vi.fn(() => false),
		} as unknown as QueryBuilderContextType;

		baseQBContext = baseContext;
		mockedUseQueryBuilder.mockReturnValue(baseQBContext);

		mockedUseQueryOperations.mockReturnValue({
			isTracePanelType: false,
			isMetricsDataSource: false,
			operators: [],
			spaceAggregationOptions: [],
			listOfAdditionalFilters: [],
			handleChangeOperator: vi.fn(),
			handleSpaceAggregationChange: vi.fn(),
			handleChangeAggregatorAttribute: vi.fn(),
			handleChangeDataSource: vi.fn(),
			handleDeleteQuery: vi.fn(),
			handleChangeQueryData:
				vi.fn() as unknown as ReturnType<UseQueryOperations>['handleChangeQueryData'],
			handleChangeFormulaData: vi.fn(),
			handleQueryFunctionsUpdates: handleQueryFunctionsUpdatesMock,
			listOfAdditionalFormulaFilters: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
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

	it('does not crash when builder.queryFormulas/queryTraceOperator are missing (partial/legacy query)', () => {
		const currentQueryBase = baseQBContext.currentQuery as Query;

		mockedUseQueryBuilder.mockReturnValue({
			...baseQBContext,
			currentQuery: {
				...currentQueryBase,
				builder: {
					queryData: currentQueryBase.builder.queryData,
					queryFormulas: undefined as unknown as [],
					queryTraceOperator: undefined as unknown as [],
				},
			},
		});

		expect(() =>
			render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />),
		).not.toThrow();

		// query list still renders from queryData, formulas block is skipped
		expect(document.querySelector('.query-names-section')).toBeInTheDocument();
		expect(
			document.querySelector('.qb-formulas-container'),
		).not.toBeInTheDocument();
	});

	it('fx button is disabled when functions already exist', async () => {
		const currentQueryBase = baseQBContext.currentQuery as Query;
		const supersetQueryBase = baseQBContext.supersetQuery as Query;

		mockedUseQueryBuilder.mockReturnValueOnce({
			...baseQBContext,
			currentQuery: {
				...currentQueryBase,
				builder: {
					...currentQueryBase.builder,
					queryData: [
						{
							...currentQueryBase.builder.queryData[0],
							functions: [
								{ name: QueryFunctionsTypes.TIME_SHIFT, args: [] } as QueryFunction,
							],
						},
					],
				},
			},
			supersetQuery: {
				...supersetQueryBase,
				builder: {
					...supersetQueryBase.builder,
					queryData: [
						{
							...supersetQueryBase.builder.queryData[0],
							functions: [
								{ name: QueryFunctionsTypes.TIME_SHIFT, args: [] } as QueryFunction,
							],
						},
					],
				},
			},
		});

		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		const fxButton = document.querySelector('.function-btn') as HTMLButtonElement;
		expect(fxButton).toBeInTheDocument();
		expect(fxButton).toBeDisabled();

		const deleteButton = document.querySelector(
			'.query-function-delete-btn',
		) as HTMLButtonElement;
		expect(deleteButton).toBeInTheDocument();
		await userEvent.click(deleteButton);
		await waitFor(() => {
			expect(fxButton).not.toBeDisabled();
		});
	});
});
