import { render, screen, userEvent } from 'tests/test-utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { requireQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';

import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder';

const tabId = (queryType: EQueryType): string => `query-type-tab-${queryType}`;

// Capture the props the (real-guard-fed) QueryBuilderV2 receives without rendering it.
const mockQueryBuilderV2 = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('hooks/useDarkMode', () => ({ useIsDarkMode: (): boolean => false }));
jest.mock('components/QueryBuilderV2/useSyncQueryBuilderFields', () => ({
	useSyncQueryBuilderFields: jest.fn(),
}));
jest.mock('components/QueryBuilderV2/QueryBuilderV2', () => ({
	QueryBuilderV2: (props: unknown): null => {
		mockQueryBuilderV2(props);
		return null;
	},
}));
jest.mock('container/QueryBuilder/rawQueryEditors/ClickHouse', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/QueryBuilder/rawQueryEditors/PromQL', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/QueryBuilder/components/RunQueryBtn/RunQueryBtn', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('components/TextToolTip', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('assets/Dashboard/PromQl', () => ({
	__esModule: true,
	default: (): null => null,
}));

const mockUseQueryBuilder = useQueryBuilder as unknown as jest.Mock;

const BUILDER_QUERY = {
	queryType: EQueryType.QUERY_BUILDER,
	builder: { queryData: [{ dataSource: 'traces' }] },
};
const AI_QUERY = {
	queryType: EQueryType.AI_QUERY_BUILDER,
	builder: { queryData: [] },
	builder_ai_query: {
		queryData: [{ dataSource: 'traces', builderQueryType: 'builder_ai_query' }],
	},
};

/** Stands in for the editor shell. */
function BuilderHost({ panelKind }: { panelKind: PanelKind }): JSX.Element {
	const panelDefinition = requireQueryPanelDefinition(panelKind);
	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			isLoadingQueries={false}
			onStageRunQuery={jest.fn()}
			onCancelQuery={jest.fn()}
		/>
	);
}

function renderBuilder(panelKind: string): void {
	render(<BuilderHost panelKind={panelKind as PanelKind} />);
}

function lastQueryBuilderProps(): {
	panelType: string;
	isRawQuery: boolean;
	showTraceOperator: boolean;
	fieldsConfig: unknown;
	allowedDataSources: string[];
} {
	const calls = mockQueryBuilderV2.mock.calls;
	return calls[calls.length - 1][0];
}

describe('PanelEditorQueryBuilder query-type tabs (driven by the capabilities guard)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: BUILDER_QUERY,
			redirectWithQueryBuilderData: jest.fn(),
		});
	});

	it('shows no ClickHouse or PromQL tab for the List kind', () => {
		renderBuilder('signoz/ListPanel');

		expect(
			screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId(tabId(EQueryType.CLICKHOUSE)),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId(tabId(EQueryType.PROM))).not.toBeInTheDocument();
	});

	it('shows Query Builder + ClickHouse but not PromQL for the Table kind', () => {
		renderBuilder('signoz/TablePanel');

		expect(
			screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)),
		).toBeInTheDocument();
		expect(screen.getByTestId(tabId(EQueryType.CLICKHOUSE))).toBeInTheDocument();
		expect(screen.queryByTestId(tabId(EQueryType.PROM))).not.toBeInTheDocument();
	});

	it('shows all four tabs for the Time Series kind', () => {
		renderBuilder('signoz/TimeSeriesPanel');

		expect(
			screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)),
		).toBeInTheDocument();
		expect(screen.getByTestId(tabId(EQueryType.CLICKHOUSE))).toBeInTheDocument();
		expect(screen.getByTestId(tabId(EQueryType.PROM))).toBeInTheDocument();
		expect(
			screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)),
		).toBeInTheDocument();
	});

	it('shows the AI tab for the Table kind', () => {
		renderBuilder('signoz/TablePanel');
		expect(
			screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)),
		).toBeInTheDocument();
	});

	it('shows the AI tab for the List kind', () => {
		renderBuilder('signoz/ListPanel');
		expect(
			screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)),
		).toBeInTheDocument();
	});
});

describe('PanelEditorQueryBuilder AI tab', () => {
	const redirectWithQueryBuilderData = jest.fn();
	const updateAllQueriesOperators = jest.fn((query: unknown) => query);

	function mockBuilder(currentQuery: unknown): void {
		mockUseQueryBuilder.mockReturnValue({
			currentQuery,
			redirectWithQueryBuilderData,
			updateAllQueriesOperators,
		});
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('activates the AI tab for an AI query and pins the builder to traces', () => {
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		expect(screen.getByRole('tab', { selected: true })).toContainElement(
			screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)),
		);
		expect(lastQueryBuilderProps()).toMatchObject({
			config: { initialDataSource: 'traces', queryVariant: 'static' },
			showTraceOperator: false,
		});
	});

	it('seeds an AI traces query when switching to the AI tab', async () => {
		const user = userEvent.setup();
		mockBuilder(BUILDER_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		await user.click(screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)));

		expect(updateAllQueriesOperators).toHaveBeenCalledWith(
			expect.anything(),
			'graph',
			'traces',
		);
		const [seeded] = redirectWithQueryBuilderData.mock.calls[0];
		expect(seeded.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(seeded.builder_ai_query.queryData[0]).toMatchObject({
			dataSource: 'traces',
		});
		expect(seeded.builder_ai_query.queryData[0].builderQueryType).toBeUndefined();
		expect(seeded.builder).toBe(BUILDER_QUERY.builder);
	});

	it('keeps the builder query when returning from ClickHouse', async () => {
		const user = userEvent.setup();
		const logsQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ dataSource: 'logs', legend: 'kept' }] },
		};
		mockBuilder(logsQuery);
		renderBuilder('signoz/TimeSeriesPanel');

		await user.click(screen.getByTestId(tabId(EQueryType.CLICKHOUSE)));
		const [onClickHouse] = redirectWithQueryBuilderData.mock.calls[0];
		expect(onClickHouse.queryType).toBe(EQueryType.CLICKHOUSE);
		// The builder slot already holds the Query Builder query — nothing to swap.
		expect(onClickHouse.builder).toBe(logsQuery.builder);
	});

	it('seeds a default query for the kind when leaving AI for an unused Query Builder', async () => {
		const user = userEvent.setup();
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		await user.click(screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)));

		const [next] = redirectWithQueryBuilderData.mock.calls[0];
		expect(next.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(next.builder.queryData[0].builderQueryType).toBeUndefined();
		expect(next.builder.queryData[0].dataSource).toBe('metrics');
	});

	it("reseeds a Query Builder query this kind can't author when leaving AI", async () => {
		const user = userEvent.setup();
		mockBuilder({
			...AI_QUERY,
			builder: { queryData: [{ dataSource: 'metrics' }] },
		});
		renderBuilder('signoz/ListPanel');

		await user.click(screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)));

		const [next] = redirectWithQueryBuilderData.mock.calls[0];
		expect(next.builder.queryData[0].dataSource).toBe('logs');
	});

	it("keeps each tab's own query across Query Builder ↔ AI round trips", async () => {
		const user = userEvent.setup();
		const logsQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ dataSource: 'logs' }] },
		};
		const host = (): JSX.Element => (
			<BuilderHost panelKind="signoz/TimeSeriesPanel" />
		);
		mockBuilder(logsQuery);
		const { rerender } = render(host());

		await user.click(screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)));
		const [aiQuery] = redirectWithQueryBuilderData.mock.calls[0];
		// The user writes an AI query, then goes back to Query Builder.
		const editedAIBuilder = {
			queryData: [{ dataSource: 'traces', builderQueryType: 'builder_ai_query' }],
		};
		mockBuilder({ ...aiQuery, builder_ai_query: editedAIBuilder });
		rerender(host());
		await user.click(screen.getByTestId(tabId(EQueryType.QUERY_BUILDER)));
		const [backToQB] = redirectWithQueryBuilderData.mock.calls[1];
		expect(backToQB.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(backToQB.builder).toBe(logsQuery.builder);
		expect(backToQB.builder_ai_query).toBe(editedAIBuilder);

		mockBuilder(backToQB);
		rerender(host());
		await user.click(screen.getByTestId(tabId(EQueryType.AI_QUERY_BUILDER)));
		const [backToAI] = redirectWithQueryBuilderData.mock.calls[2];
		expect(backToAI.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(backToAI.builder_ai_query).toBe(editedAIBuilder);
	});
});

describe('PanelEditorQueryBuilder field visibility (driven by the capabilities guard)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: BUILDER_QUERY,
			redirectWithQueryBuilderData: jest.fn(),
		});
	});

	it('passes empty field config + non-list flag for a non-list kind', () => {
		renderBuilder('signoz/TimeSeriesPanel');

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('graph');
		expect(props.isRawQuery).toBe(false);
		// The trace operator combines aggregated trace queries, so it rides along with
		// the aggregation controls.
		expect(props.showTraceOperator).toBe(true);
		expect(props.fieldsConfig).toStrictEqual({});
	});

	it('hands the fields the Heatmap hides to the builder', () => {
		renderBuilder('signoz/HeatmapPanel');

		expect(lastQueryBuilderProps().fieldsConfig).toStrictEqual({
			functions: { state: 'hidden' },
			having: { state: 'hidden' },
			trace_operator: { state: 'hidden' },
		});
	});

	it('marks List raw and leaves the field surface to the raw baseline', () => {
		renderBuilder('signoz/ListPanel');

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('list');
		expect(props.isRawQuery).toBe(true);
		expect(props.showTraceOperator).toBe(false);
		expect(props.fieldsConfig).toStrictEqual({});
	});
});

describe('PanelEditorQueryBuilder signal dropdown (driven by the capabilities guard)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: BUILDER_QUERY,
			redirectWithQueryBuilderData: jest.fn(),
		});
	});

	it('offers every signal for the Heatmap kind', () => {
		renderBuilder('signoz/HeatmapPanel');

		expect(lastQueryBuilderProps().allowedDataSources).toStrictEqual([
			'metrics',
			'logs',
			'traces',
		]);
	});

	it('offers logs and traces for the List kind, which reads raw rows', () => {
		renderBuilder('signoz/ListPanel');

		expect(lastQueryBuilderProps().allowedDataSources).toStrictEqual([
			'logs',
			'traces',
		]);
	});

	it('offers every signal for a kind that visualizes them all', () => {
		renderBuilder('signoz/TimeSeriesPanel');

		expect(lastQueryBuilderProps().allowedDataSources).toStrictEqual([
			'metrics',
			'logs',
			'traces',
		]);
	});
});
