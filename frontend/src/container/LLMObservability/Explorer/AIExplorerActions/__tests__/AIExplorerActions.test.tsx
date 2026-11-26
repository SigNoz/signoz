import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { QueryParams } from 'constants/query';
import {
	initialFormulaBuilderFormValues,
	initialQueryAIWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ExplorerActionsSource } from 'container/ExplorerActions/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { rest, server } from 'mocks-server/server';
import { mockAppNavigate } from 'tests/router-mocks';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { defaultSelectedColumns } from '../../ListView/configs';
import AIExplorerActions from '../AIExplorerActions';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

const FILTER = "gen_ai.request.model = 'gpt-4o'";

function aiStagedQuery(aggregations?: IBuilderQuery['aggregations']): Query {
	const aiBuilder = getActiveBuilder(initialQueryAIWithType);
	return {
		...initialQueryAIWithType,
		builder_ai_query: {
			...aiBuilder,
			queryData: [
				{
					...aiBuilder.queryData[0],
					...(aggregations && { aggregations }),
					filter: { expression: FILTER },
					groupBy: [
						{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
					],
					having: { expression: 'count() > 5' },
					orderBy: [{ columnName: 'timestamp', order: 'asc' }],
				},
			],
		},
	};
}

async function exportFrom(
	panelType: PANEL_TYPES,
	stagedQuery: Query = aiStagedQuery(),
): Promise<void> {
	mockedUseQueryBuilder.mockReturnValue({
		stagedQuery,
		panelType,
	} as ReturnType<typeof useQueryBuilder>);
	server.use(
		rest.get('*/api/v2/users/me/dashboards', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { dashboards: [] } }),
			),
		),
		rest.post('*/api/v2/dashboards', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { id: 'dash-1' } }),
			),
		),
	);
	const user = userEvent.setup();

	render(<AIExplorerActions />);
	await user.click(screen.getByTestId('explorer-add-to-dashboard'));
	await user.click(await screen.findByTestId('export-panel-new-dashboard'));

	await waitFor(() => expect(safeNavigateMock).toHaveBeenCalledTimes(1));
}

async function createAlertFrom(
	panelType: PANEL_TYPES,
	stagedQuery: Query = aiStagedQuery(),
): Promise<Query> {
	const navigate = mockAppNavigate();
	mockedUseQueryBuilder.mockReturnValue({
		stagedQuery,
		panelType,
	} as ReturnType<typeof useQueryBuilder>);

	render(<AIExplorerActions />);
	await userEvent.setup().click(screen.getByTestId('explorer-create-alert'));

	expect(navigate).toHaveBeenCalledTimes(1);
	const [path, search] = (navigate.mock.calls[0][0] as string).split('?');
	expect(path).toBe(ROUTES.ALERTS_NEW);
	return JSON.parse(
		decodeURIComponent(
			new URLSearchParams(search).get(QueryParams.compositeQuery) ?? '',
		),
	) as Query;
}

function exportedPanel(): { panelKind: string | null; query: Query } {
	const link = safeNavigateMock.mock.calls[0][0] as string;
	const params = new URLSearchParams(link.split('?')[1]);
	return {
		panelKind: params.get('panelKind'),
		query: JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) ?? ''),
		) as Query,
	};
}

describe('AIExplorerActions', () => {
	it('logs the AI explorer events, not the traces ones', async () => {
		await exportFrom(PANEL_TYPES.TABLE);

		expect(logEventMock).toHaveBeenCalledWith(
			'AI Observability Explorer: Add to dashboard clicked',
			{
				sourcepage: ExplorerActionsSource.AI_OBSERVABILITY,
				panelType: PANEL_TYPES.TABLE,
			},
		);
		expect(logEventMock).toHaveBeenCalledWith(
			'AI Observability Explorer: Add to dashboard successful',
			{
				sourcepage: ExplorerActionsSource.AI_OBSERVABILITY,
				panelType: PANEL_TYPES.TABLE,
				isNewDashboard: true,
				dashboardName: expect.any(String),
			},
		);
	});

	it('list: exports an AI List panel with the list columns and no group by, having or order by', async () => {
		await exportFrom(PANEL_TYPES.LIST);

		const { panelKind, query } = exportedPanel();
		expect(panelKind).toBe('signoz/ListPanel');
		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(getActiveBuilder(query).queryData[0]).toMatchObject({
			filter: { expression: FILTER },
			groupBy: [],
			having: { expression: '' },
			orderBy: [],
			selectColumns: defaultSelectedColumns,
		});
	});

	it('trace: exports an AI Time Series panel with no group by, having or order by', async () => {
		await exportFrom(PANEL_TYPES.TRACE);

		const { panelKind, query } = exportedPanel();
		expect(panelKind).toBe('signoz/TimeSeriesPanel');
		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		const [queryData] = getActiveBuilder(query).queryData;
		expect(queryData).toMatchObject({
			filter: { expression: FILTER },
			groupBy: [],
			having: { expression: '' },
			orderBy: [],
		});
		expect(queryData.selectColumns).toBeUndefined();
	});

	it('trace: exports without the formulas, step, limit and legend Timeseries set', async () => {
		const stagedQuery = aiStagedQuery();
		const aiBuilder = getActiveBuilder(stagedQuery);
		await exportFrom(PANEL_TYPES.TRACE, {
			...stagedQuery,
			builder_ai_query: {
				...aiBuilder,
				queryData: [
					{
						...aiBuilder.queryData[0],
						stepInterval: 300,
						limit: 10,
						legend: '{{service.name}}',
					},
				],
				queryFormulas: [
					{ ...initialFormulaBuilderFormValues, expression: 'A*100' },
				],
			},
		});

		const exported = getActiveBuilder(exportedPanel().query);
		expect(exported.queryFormulas).toStrictEqual([]);
		expect(exported.queryData[0]).toMatchObject({
			stepInterval: null,
			limit: null,
			legend: '',
		});
	});

	it('create alert: logs the AI explorer event, not the traces one', async () => {
		await createAlertFrom(PANEL_TYPES.TIME_SERIES);

		expect(logEventMock).toHaveBeenCalledWith(
			'AI Observability Explorer: Create alert',
			{
				sourcepage: ExplorerActionsSource.AI_OBSERVABILITY,
				panelType: PANEL_TYPES.TIME_SERIES,
			},
		);
	});

	it('without a staged query: both actions are disabled and create alert goes nowhere', async () => {
		const navigate = mockAppNavigate();
		mockedUseQueryBuilder.mockReturnValue({
			stagedQuery: null,
			panelType: PANEL_TYPES.LIST,
		} as ReturnType<typeof useQueryBuilder>);

		render(<AIExplorerActions />);
		const createAlert = screen.getByTestId('explorer-create-alert');
		await userEvent.setup().click(createAlert);

		expect(createAlert).toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByTestId('explorer-add-to-dashboard')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE])(
		'create alert from %s: keeps the aggregation, group by, having and order by',
		async (panelType) => {
			const query = await createAlertFrom(
				panelType,
				aiStagedQuery([{ expression: 'avg(duration_nano)' }]),
			);

			expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
			expect(getActiveBuilder(query).queryData[0]).toMatchObject({
				aggregations: [{ expression: 'avg(duration_nano)' }],
				filter: { expression: FILTER },
				groupBy: [
					{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
				],
				having: { expression: 'count() > 5' },
				orderBy: [{ columnName: 'timestamp', order: 'asc' }],
			});
		},
	);

	it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
		'create alert from %s: a count with no group by, having or order by',
		async (panelType) => {
			const query = await createAlertFrom(
				panelType,
				aiStagedQuery([{ expression: 'avg(duration_nano)' }]),
			);

			expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
			const [queryData] = getActiveBuilder(query).queryData;
			expect(queryData).toMatchObject({
				aggregations: [{ expression: 'count()' }],
				filter: { expression: FILTER },
				groupBy: [],
				having: { expression: '' },
				orderBy: [],
			});
			expect(queryData.selectColumns).toBeUndefined();
		},
	);

	it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
		'create alert from %s: only the first query, the one the view shows',
		async (panelType) => {
			const stagedQuery = aiStagedQuery();
			const aiBuilder = getActiveBuilder(stagedQuery);
			const [first] = aiBuilder.queryData;
			const query = await createAlertFrom(panelType, {
				...stagedQuery,
				builder_ai_query: {
					...aiBuilder,
					queryData: [first, { ...first, queryName: 'B', expression: 'B' }],
				},
			});

			expect(
				getActiveBuilder(query).queryData.map(({ queryName }) => queryName),
			).toStrictEqual([first.queryName]);
		},
	);
});
