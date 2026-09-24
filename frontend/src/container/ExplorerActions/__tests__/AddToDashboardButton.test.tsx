import logEvent from 'api/common/logEvent';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import {
	getExportQueryData as getLogsExportQuery,
	getQueryByPanelType as getLogsQueryByPanelType,
} from 'container/LogsExplorerViews/explorerUtils';
import { OptionsQuery } from 'container/OptionsMenu/types';
import {
	getExportQueryData as getTracesExportQuery,
	getQueryByPanelType as getTracesQueryByPanelType,
} from 'container/TracesExplorer/explorerUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { buildExportPanelLink } from 'pages/DashboardPage/DashboardContainer/PanelEditor/newPanelRoute';
import { render, screen, userEvent } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import AddToDashboardButton from '../AddToDashboardButton';
import { EXPLORER_ACTION_EVENTS, getExportPanelType } from '../utils';

const DASHBOARD = { id: 'dash-1', title: 'Dash 1' };

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: (): string => 'widget-1' }));
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve()),
}));
// The picker is the dialog's business; here it just hands a dashboard back.
jest.mock('container/ExportPanel/ExportPanelContainer', () => ({
	__esModule: true,
	default: ({
		open,
		query,
		onExport,
	}: {
		open: boolean;
		query: Query | null;
		onExport: (dashboard: { id: string; title: string }) => void;
	}): JSX.Element | null =>
		open ? (
			<button
				type="button"
				data-testid="export-stub"
				data-query={JSON.stringify(query)}
				onClick={(): void => onExport({ id: 'dash-1', title: 'Dash 1' })}
			>
				export
			</button>
		) : null,
}));

const mockSafeNavigate = jest.fn();
const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);
const mockedUseSafeNavigate = jest.mocked(useSafeNavigate);
const mockedLogEvent = jest.mocked(logEvent);

const FILTER = "service.name = 'frontend'";
const COLUMNS = [{ name: 'service.name' }, { name: 'name' }];
const options = { selectColumns: COLUMNS } as unknown as OptionsQuery;

function stagedQuery(dataSource: DataSource, queryName = 'A'): Query {
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
					aggregateOperator: StringOperators.COUNT,
					filter: { expression: FILTER },
					orderBy: [{ columnName: 'timestamp', order: 'asc' }],
					groupBy: [{ key: 'service.name', dataType: 'string', type: 'resource' }],
				},
			],
		},
	} as Query;
}

function setPanelType(panelType: PANEL_TYPES): void {
	mockedUseQueryBuilder.mockReturnValue({ panelType } as ReturnType<
		typeof useQueryBuilder
	>);
}

async function exportTo(
	query: Query | null,
	sourcepage: DataSource,
	panelType: PANEL_TYPES,
	panelTypeProp?: PANEL_TYPES,
): Promise<void> {
	setPanelType(panelType);
	render(
		<AddToDashboardButton
			query={query}
			sourcepage={sourcepage}
			panelType={panelTypeProp}
		/>,
	);
	const user = userEvent.setup();
	await user.click(screen.getByTestId('explorer-add-to-dashboard'));
	await user.click(screen.getByTestId('export-stub'));
}

function expectedLink(query: Query, panelType: PANEL_TYPES): string | null {
	return buildExportPanelLink({
		query,
		panelType,
		dashboardId: DASHBOARD.id,
	});
}

describe('AddToDashboardButton', () => {
	beforeEach(() => {
		mockSafeNavigate.mockReset();
		mockedLogEvent.mockClear();
		mockedUseSafeNavigate.mockReturnValue({ safeNavigate: mockSafeNavigate });
	});

	it('is disabled without a query and the picker stays closed', () => {
		setPanelType(PANEL_TYPES.LIST);
		render(<AddToDashboardButton query={null} sourcepage={DataSource.LOGS} />);

		expect(screen.getByTestId('explorer-add-to-dashboard')).toBeDisabled();
		expect(screen.queryByTestId('export-stub')).not.toBeInTheDocument();
	});

	it('hands the picker the same query it will export', async () => {
		const query = stagedQuery(DataSource.LOGS);
		setPanelType(PANEL_TYPES.TIME_SERIES);
		render(<AddToDashboardButton query={query} sourcepage={DataSource.LOGS} />);

		await userEvent
			.setup()
			.click(screen.getByTestId('explorer-add-to-dashboard'));

		expect(screen.getByTestId('export-stub')).toHaveAttribute(
			'data-query',
			JSON.stringify(query),
		);
	});

	it('logs open and success with the source page', async () => {
		const query = stagedQuery(DataSource.TRACES);

		await exportTo(query, DataSource.TRACES, PANEL_TYPES.TABLE);

		expect(mockedLogEvent).toHaveBeenCalledWith(
			EXPLORER_ACTION_EVENTS.addToDashboard,
			{
				sourcepage: DataSource.TRACES,
				panelType: PANEL_TYPES.TABLE,
			},
		);
		expect(mockedLogEvent).toHaveBeenCalledWith(EXPLORER_ACTION_EVENTS.exported, {
			sourcepage: DataSource.TRACES,
			panelType: PANEL_TYPES.TABLE,
			isNewDashboard: undefined,
			dashboardName: DASHBOARD.title,
		});
	});

	it('a panel type from the page wins over the fold of the context one', async () => {
		const query = stagedQuery(DataSource.METRICS);

		// context says list, the page says time series
		await exportTo(
			query,
			DataSource.METRICS,
			PANEL_TYPES.LIST,
			PANEL_TYPES.TIME_SERIES,
		);

		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expectedLink(query, PANEL_TYPES.TIME_SERIES),
		);
	});

	describe('logs, the query the page hands over per view', () => {
		const staged = stagedQuery(DataSource.LOGS);

		it('list: the list request shaping with timestamp desc, panel type list', async () => {
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

			await exportTo(exportQuery, DataSource.LOGS, PANEL_TYPES.LIST);

			expect(exportQuery.builder.queryData[0].orderBy).toStrictEqual([
				{ columnName: 'timestamp', order: 'desc' },
			]);
			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expectedLink(exportQuery, PANEL_TYPES.LIST),
			);
		});

		it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE])(
			'%s: staged query untouched, same panel type',
			async (panelType) => {
				const exportQuery = getLogsExportQuery(staged, panelType) as Query;

				await exportTo(exportQuery, DataSource.LOGS, panelType);

				expect(exportQuery).toBe(staged);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					expectedLink(staged, panelType),
				);
			},
		);
	});

	describe('traces, the query the page hands over per view', () => {
		const staged = stagedQuery(DataSource.TRACES);

		it('list: list shaping plus the selected columns, panel type list', async () => {
			const exportQuery = getTracesExportQuery(
				getTracesQueryByPanelType(staged, PANEL_TYPES.LIST),
				getExportPanelType(PANEL_TYPES.LIST),
				options,
			);

			await exportTo(exportQuery, DataSource.TRACES, PANEL_TYPES.LIST);

			const [queryData] = exportQuery.builder.queryData;
			expect(queryData.selectColumns).toStrictEqual(COLUMNS);
			expect(queryData.groupBy).toStrictEqual([]);
			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expectedLink(exportQuery, PANEL_TYPES.LIST),
			);
		});

		it('trace: list shaping, no columns, panel type folds to time series', async () => {
			const exportQuery = getTracesExportQuery(
				getTracesQueryByPanelType(staged, PANEL_TYPES.TRACE),
				getExportPanelType(PANEL_TYPES.TRACE),
				options,
			);

			await exportTo(exportQuery, DataSource.TRACES, PANEL_TYPES.TRACE);

			expect(exportQuery.builder.queryData[0].selectColumns).toBeUndefined();
			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expectedLink(exportQuery, PANEL_TYPES.TIME_SERIES),
			);
		});

		// Same as the alert: the list / trace order lives in ListView state and the
		// page shapes the export without it, so the panel query has no order by.
		it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
			'%s: order by is not carried into the panel query',
			async (panelType) => {
				expect(staged.builder.queryData[0].orderBy).toHaveLength(1);
				const exportQuery = getTracesExportQuery(
					getTracesQueryByPanelType(staged, panelType),
					getExportPanelType(panelType),
					options,
				);

				await exportTo(exportQuery, DataSource.TRACES, panelType);

				expect(exportQuery.builder.queryData[0].orderBy).toStrictEqual([]);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					expectedLink(exportQuery, getExportPanelType(panelType)),
				);
			},
		);

		it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE])(
			'%s: staged query untouched, same panel type',
			async (panelType) => {
				const exportQuery = getTracesExportQuery(
					getTracesQueryByPanelType(staged, panelType),
					getExportPanelType(panelType),
					options,
				);

				await exportTo(exportQuery, DataSource.TRACES, panelType);

				expect(exportQuery).toBe(staged);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					expectedLink(staged, panelType),
				);
			},
		);
	});

	it('metrics: the chart query as is, panel type time series from the page', async () => {
		const query = stagedQuery(DataSource.METRICS);

		await exportTo(
			query,
			DataSource.METRICS,
			PANEL_TYPES.TIME_SERIES,
			PANEL_TYPES.TIME_SERIES,
		);

		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expectedLink(query, PANEL_TYPES.TIME_SERIES),
		);
	});
});
