import { useHistory } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	getExportQueryData as getLogsExportQuery,
	getQueryByPanelType as getLogsQueryByPanelType,
} from 'container/LogsExplorerViews/explorerUtils';
import { getQueryByPanelType as getTracesQueryByPanelType } from 'container/TracesExplorer/explorerUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { render, screen, userEvent } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import CreateAlertButton from '../CreateAlertButton';
import { EXPLORER_ACTION_EVENTS } from '../utils';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useHistory: jest.fn(),
}));
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve()),
}));

const mockPush = jest.fn();
const mockedUseHistory = jest.mocked(useHistory);
const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);
const mockedLogEvent = jest.mocked(logEvent);

const FILTER = "service.name = 'frontend'";
const ORDER_BY = [{ columnName: 'timestamp', order: 'asc' }];

function stagedQuery(
	dataSource: DataSource,
	aggregateOperator: StringOperators,
	queryName = 'A',
): Query {
	const base = initialQueriesMap[dataSource];
	return {
		...base,
		id: `query-${queryName}`,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					queryName,
					aggregateOperator,
					filter: { expression: FILTER },
					orderBy: ORDER_BY,
					groupBy: [{ key: 'service.name', dataType: 'string', type: 'resource' }],
				},
			],
		},
	} as Query;
}

function pushedQuery(): Query {
	expect(mockPush).toHaveBeenCalledTimes(1);
	const [path, search] = (mockPush.mock.calls[0][0] as string).split('?');
	expect(path).toBe(ROUTES.ALERTS_NEW);
	const raw = new URLSearchParams(search).get(QueryParams.compositeQuery);
	return JSON.parse(raw as string);
}

function setPanelType(panelType: PANEL_TYPES): void {
	mockedUseQueryBuilder.mockReturnValue({ panelType } as ReturnType<
		typeof useQueryBuilder
	>);
}

async function clickCreateAlert(
	query: Query | null,
	sourcepage: DataSource,
	panelType: PANEL_TYPES,
): Promise<void> {
	setPanelType(panelType);
	render(<CreateAlertButton query={query} sourcepage={sourcepage} />);
	await userEvent.setup().click(screen.getByTestId('explorer-create-alert'));
}

describe('CreateAlertButton', () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockedLogEvent.mockClear();
		mockedUseHistory.mockReturnValue({ push: mockPush } as unknown as ReturnType<
			typeof useHistory
		>);
	});

	it('is disabled and does nothing without a query', async () => {
		await clickCreateAlert(null, DataSource.LOGS, PANEL_TYPES.LIST);

		expect(screen.getByTestId('explorer-create-alert')).toBeDisabled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('logs one event with the source page', async () => {
		const query = stagedQuery(DataSource.TRACES, StringOperators.COUNT);

		await clickCreateAlert(query, DataSource.TRACES, PANEL_TYPES.TIME_SERIES);

		expect(mockedLogEvent).toHaveBeenCalledWith(
			EXPLORER_ACTION_EVENTS.createAlert,
			{
				sourcepage: DataSource.TRACES,
				panelType: PANEL_TYPES.TIME_SERIES,
			},
		);
	});

	describe('logs, the query the page hands over per view', () => {
		const staged = stagedQuery(DataSource.LOGS, StringOperators.NOOP);

		it('list: count aggregation, no order by, filter and pagination as the page sent them', async () => {
			const listRequest = getLogsQueryByPanelType(staged, PANEL_TYPES.LIST, {
				page: 1,
				pageSize: 100,
				filters: { items: [], op: 'AND' },
				filter: { expression: FILTER },
			});
			const exportQuery = getLogsExportQuery(
				listRequest,
				PANEL_TYPES.LIST,
			) as Query;

			await clickCreateAlert(exportQuery, DataSource.LOGS, PANEL_TYPES.LIST);

			const [queryData] = pushedQuery().builder.queryData;
			expect(queryData.aggregateOperator).toBe(StringOperators.COUNT);
			expect(queryData.orderBy).toStrictEqual([]);
			expect(queryData.groupBy).toStrictEqual([]);
			expect(queryData.filter).toStrictEqual({ expression: FILTER });
			expect(queryData.pageSize).toBe(100);
		});

		it('time series: staged query as is, order by and group by kept', async () => {
			const tsStaged = stagedQuery(DataSource.LOGS, StringOperators.COUNT);
			const exportQuery = getLogsExportQuery(
				tsStaged,
				PANEL_TYPES.TIME_SERIES,
			) as Query;

			await clickCreateAlert(
				exportQuery,
				DataSource.LOGS,
				PANEL_TYPES.TIME_SERIES,
			);

			const [queryData] = pushedQuery().builder.queryData;
			expect(queryData).toStrictEqual(tsStaged.builder.queryData[0]);
		});

		it('table: staged query as is', async () => {
			const tableStaged = stagedQuery(DataSource.LOGS, StringOperators.COUNT);
			const exportQuery = getLogsExportQuery(
				tableStaged,
				PANEL_TYPES.TABLE,
			) as Query;

			await clickCreateAlert(exportQuery, DataSource.LOGS, PANEL_TYPES.TABLE);

			expect(pushedQuery().builder).toStrictEqual(tableStaged.builder);
		});
	});

	describe('traces, the query the page hands over per view', () => {
		const staged = stagedQuery(DataSource.TRACES, StringOperators.NOOP);

		it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
			'%s: count aggregation, group by cleared by the list shaping, filter kept',
			async (panelType) => {
				const exportQuery = getTracesQueryByPanelType(staged, panelType);

				await clickCreateAlert(exportQuery, DataSource.TRACES, panelType);

				const [queryData] = pushedQuery().builder.queryData;
				expect(queryData.aggregateOperator).toBe(StringOperators.COUNT);
				expect(queryData.groupBy).toStrictEqual([]);
				expect(queryData.filter).toStrictEqual({ expression: FILTER });
			},
		);

		// The list / trace views keep their order in ListView state, and the page
		// shapes the export without it, so the alert never sees an order by.
		it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
			'%s: order by is not carried, even when the staged query has one',
			async (panelType) => {
				expect(staged.builder.queryData[0].orderBy).toStrictEqual(ORDER_BY);
				const exportQuery = getTracesQueryByPanelType(staged, panelType);

				await clickCreateAlert(exportQuery, DataSource.TRACES, panelType);

				expect(pushedQuery().builder.queryData[0].orderBy).toStrictEqual([]);
			},
		);

		it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE])(
			'%s: staged query as is',
			async (panelType) => {
				const aggStaged = stagedQuery(DataSource.TRACES, StringOperators.COUNT);
				const exportQuery = getTracesQueryByPanelType(aggStaged, panelType);

				await clickCreateAlert(exportQuery, DataSource.TRACES, panelType);

				expect(pushedQuery().builder).toStrictEqual(aggStaged.builder);
			},
		);
	});

	it('metrics: the chart query as is', async () => {
		const query = stagedQuery(DataSource.METRICS, StringOperators.COUNT);

		await clickCreateAlert(query, DataSource.METRICS, PANEL_TYPES.TIME_SERIES);

		expect(pushedQuery().builder).toStrictEqual(query.builder);
	});
});
