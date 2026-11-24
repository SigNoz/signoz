/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { jest } from '@jest/globals';
import { ENVIRONMENT } from 'constants/env';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, within } from 'tests/test-utils';
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

import '@testing-library/jest-dom';

import { QueryBuilderV2 } from '../../QueryBuilderV2';
import { QueryBuilderV2Provider } from '../../QueryBuilderV2Context';
import { QueryV2 } from '../QueryV2';

// Local mocks for domain-specific heavy child components
jest.mock(
	'../QueryAggregation/QueryAggregation',
	() =>
		function QueryAggregation() {
			return <div>QueryAggregation</div>;
		},
);
jest.mock(
	'../MerticsAggregateSection/MetricsAggregateSection',
	() =>
		function MetricsAggregateSection() {
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
	let handleQueryFunctionsUpdatesMock: jest.MockedFunction<() => void>;
	let baseQBContext: QueryBuilderContextType;

	beforeEach(() => {
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ status: 'success', data: { complete: true, keys: {} } }),
				),
			),
		);

		const mockCloneQuery = jest.fn() as jest.MockedFunction<
			(type: string, q: IBuilderQuery) => void
		>;
		handleRunQueryMock = jest.fn() as jest.MockedFunction<() => void>;
		handleQueryFunctionsUpdatesMock = jest.fn() as jest.MockedFunction<
			() => void
		>;
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
			isDefaultQuery: jest.fn(() => false),
		} as unknown as QueryBuilderContextType;

		baseQBContext = baseContext;
		mockedUseQueryBuilder.mockReturnValue(baseQBContext);

		mockedUseQueryOperations.mockReturnValue({
			isTracePanelType: false,
			isMetricsDataSource: false,
			operators: [],
			spaceAggregationOptions: [],
			handleChangeOperator: jest.fn(),
			handleSpaceAggregationChange: jest.fn(),
			handleChangeAggregatorAttribute: jest.fn(),
			handleChangeDataSource: jest.fn(),
			handleDeleteQuery: jest.fn(),
			handleChangeQueryData:
				jest.fn() as unknown as ReturnType<UseQueryOperations>['handleChangeQueryData'],
			handleChangeFormulaData: jest.fn(),
			handleQueryFunctionsUpdates: handleQueryFunctionsUpdatesMock,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const renderQueryV2 = (queriesCount: number): void => {
		const [queryA] = (baseQBContext.currentQuery as Query).builder.queryData;
		render(
			<QueryBuilderV2Provider>
				<QueryV2
					index={0}
					query={queryA}
					version="v4"
					isAvailableToDisable={false}
					isMultiQueryAllowed
					queriesCount={queriesCount}
					onSignalSourceChange={jest.fn()}
					signalSourceChangeEnabled={false}
					savePreviousQuery={false}
				/>
			</QueryBuilderV2Provider>,
		);
	};

	it('renders limit input when dataSource is logs', () => {
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		// Ensure the Limit add-on input is present and is of type number
		const limitInput = screen.getByPlaceholderText(
			'Enter limit',
		) as HTMLInputElement;
		expect(limitInput).toBeInTheDocument();
		expect(limitInput).toHaveAttribute('type', 'number');
		expect(limitInput).toHaveAttribute('name', 'limit');
		expect(limitInput).toHaveAttribute('data-testid', 'input-Limit-field');
	});

	it('Cmd+Enter on the limit input triggers handleRunQuery via container handler', async () => {
		const user = userEvent.setup();
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		screen.getByTestId('input-Limit-field').focus();
		await user.keyboard('{Meta>}{Enter}{/Meta}');

		expect(handleRunQueryMock).toHaveBeenCalledTimes(1);
	});

	it('Cmd+Enter on the legend input triggers handleRunQuery via container handler', async () => {
		const user = userEvent.setup();
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		screen.getByPlaceholderText('Write legend format').focus();
		await user.keyboard('{Meta>}{Enter}{/Meta}');

		expect(handleRunQueryMock).toHaveBeenCalledTimes(1);
	});

	it('Cmd+Enter in the where clause editor triggers handleRunQuery via container handler', async () => {
		const user = userEvent.setup();
		render(<QueryBuilderV2 panelType={PANEL_TYPES.TABLE} version="v4" />);

		const editorWrapper = await screen.findByTestId('query-where-clause-editor');
		within(editorWrapper).getByRole('textbox', { hidden: true }).focus();
		await user.keyboard('{Meta>}{Enter}{/Meta}');

		expect(handleRunQueryMock).toHaveBeenCalledTimes(1);
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
		expect(screen.getByTestId('query-names-section')).toBeInTheDocument();
		expect(screen.queryByTestId('qb-formulas-container')).not.toBeInTheDocument();
	});

	describe('query actions menu', () => {
		it('Clone calls cloneQuery with the query', async () => {
			const user = userEvent.setup();
			renderQueryV2(1);

			await user.click(screen.getByTestId('query-actions'));
			await user.click(
				await screen.findByTestId('query-actions-item-clone-query'),
			);

			expect(baseQBContext.cloneQuery).toHaveBeenCalledTimes(1);
			expect(baseQBContext.cloneQuery).toHaveBeenCalledWith(
				'query',
				expect.objectContaining({ queryName: 'A' }),
			);
		});

		it('hides Delete when there is a single query', async () => {
			const user = userEvent.setup();
			renderQueryV2(1);

			await user.click(screen.getByTestId('query-actions'));
			await screen.findByTestId('query-actions-item-clone-query');

			expect(
				screen.queryByTestId('query-actions-item-delete-query'),
			).not.toBeInTheDocument();
		});

		it('shows Delete with more than one query and deletes on click', async () => {
			const user = userEvent.setup();
			const handleDeleteQuery = jest.fn();
			mockedUseQueryOperations.mockReturnValue({
				...mockedUseQueryOperations({} as Parameters<UseQueryOperations>[0]),
				handleDeleteQuery,
			});

			renderQueryV2(2);

			await user.click(screen.getByTestId('query-actions'));
			await user.click(
				await screen.findByTestId('query-actions-item-delete-query'),
			);

			expect(handleDeleteQuery).toHaveBeenCalledTimes(1);
		});
	});

	it('fx button is disabled when functions already exist', async () => {
		const user = userEvent.setup();
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

		const fxButton = screen.getByTestId('query-functions-fx-btn');
		expect(fxButton).toBeInTheDocument();
		expect(fxButton).toBeDisabled();

		const deleteButton = screen.getByTestId('query-function-delete-btn');
		expect(deleteButton).toBeInTheDocument();
		await user.click(deleteButton);
		expect(fxButton).not.toBeDisabled();
	});
});
