import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { QueryParams } from 'constants/query';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { defaultSelectedColumns } from '../../ListView/configs';
import AIExplorerActions from '../AIExplorerActions';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

const FILTER = "gen_ai.request.model = 'gpt-4o'";

function aiStagedQuery(): Query {
	const [queryData] = initialQueryAIWithType.builder.queryData;
	return {
		...initialQueryAIWithType,
		builder: {
			...initialQueryAIWithType.builder,
			queryData: [
				{
					...queryData,
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
	const user = userEvent.setup({ pointerEventsCheck: 0 });

	render(<AIExplorerActions />);
	await user.click(screen.getByTestId('explorer-add-to-dashboard'));
	await user.click(await screen.findByTestId('export-panel-new-dashboard'));

	await waitFor(() => expect(safeNavigateMock).toHaveBeenCalledTimes(1));
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
			{ sourcepage: DataSource.TRACES, panelType: PANEL_TYPES.TABLE },
		);
		expect(logEventMock).toHaveBeenCalledWith(
			'AI Observability Explorer: Add to dashboard successful',
			{
				sourcepage: DataSource.TRACES,
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
		expect(query.builder.queryData[0]).toMatchObject({
			builderQueryType: 'builder_ai_query',
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
		expect(query.builder.queryData[0]).toMatchObject({
			builderQueryType: 'builder_ai_query',
			filter: { expression: FILTER },
			groupBy: [],
			having: { expression: '' },
			orderBy: [],
		});
		expect(query.builder.queryData[0].selectColumns).toBeUndefined();
	});

	it('trace: exports a count even after Timeseries set another aggregation', async () => {
		const staged = aiStagedQuery();
		staged.builder.queryData[0].aggregations = [
			{ expression: 'avg(duration_nano)' },
		];

		await exportFrom(PANEL_TYPES.TRACE, staged);

		expect(exportedPanel().query.builder.queryData[0].aggregations).toStrictEqual(
			[{ expression: 'count()' }],
		);
	});
});
