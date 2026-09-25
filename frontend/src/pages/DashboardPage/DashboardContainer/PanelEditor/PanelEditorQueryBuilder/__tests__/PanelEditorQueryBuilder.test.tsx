import { fireEvent, render, screen } from '@testing-library/react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { requireQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';

import { useQueryModeCacheStore } from 'pages/DashboardPage/DashboardContainer/store/useQueryModeCacheStore';

import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder';

// Capture the props the (real-guard-fed) QueryBuilderV2 receives without rendering it.
const mockQueryBuilderV2 = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('hooks/useDarkMode', () => ({ useIsDarkMode: (): boolean => false }));
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
	queryType: EQueryType.QUERY_BUILDER,
	builder: {
		queryData: [{ dataSource: 'traces', builderQueryType: 'builder_ai_query' }],
	},
};

function renderBuilder(panelKind: string): void {
	render(
		<PanelEditorQueryBuilder
			panelDefinition={requireQueryPanelDefinition(panelKind as PanelKind)}
			isLoadingQueries={false}
			onStageRunQuery={jest.fn()}
			onCancelQuery={jest.fn()}
		/>,
	);
}

function lastQueryBuilderProps(): {
	panelType: string;
	isRawQuery: boolean;
	showTraceOperator: boolean;
	fieldsConfig: unknown;
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

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.queryByText('ClickHouse Query')).not.toBeInTheDocument();
		expect(screen.queryByText('PromQL')).not.toBeInTheDocument();
	});

	it('shows Query Builder + ClickHouse but not PromQL for the Table kind', () => {
		renderBuilder('signoz/TablePanel');

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.getByText('ClickHouse Query')).toBeInTheDocument();
		expect(screen.queryByText('PromQL')).not.toBeInTheDocument();
	});

	it('shows all four tabs for the Time Series kind', () => {
		renderBuilder('signoz/TimeSeriesPanel');

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.getByText('ClickHouse Query')).toBeInTheDocument();
		expect(screen.getByText('PromQL')).toBeInTheDocument();
		expect(screen.getByText('AI Query Builder')).toBeInTheDocument();
	});

	it('shows the AI tab for the Table kind', () => {
		renderBuilder('signoz/TablePanel');
		expect(screen.getByText('AI Query Builder')).toBeInTheDocument();
	});

	it('shows the AI tab for the List kind', () => {
		renderBuilder('signoz/ListPanel');
		expect(screen.getByText('AI Query Builder')).toBeInTheDocument();
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
		useQueryModeCacheStore.getState().clear();
	});

	it('activates the AI tab for an AI query and pins the builder to traces', () => {
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		expect(
			screen.getByRole('tab', { name: 'AI Query Builder', selected: true }),
		).toBeInTheDocument();
		expect(lastQueryBuilderProps()).toMatchObject({
			config: { initialDataSource: 'traces', queryVariant: 'static' },
		});
	});

	it('seeds an AI traces query when switching to the AI tab', () => {
		mockBuilder(BUILDER_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		fireEvent.click(screen.getByText('AI Query Builder'));

		expect(updateAllQueriesOperators).toHaveBeenCalledWith(
			expect.anything(),
			'graph',
			'traces',
		);
		const [seeded] = redirectWithQueryBuilderData.mock.calls[0];
		expect(seeded.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(seeded.builder.queryData[0].builderQueryType).toBe('builder_ai_query');
	});

	it('keeps the builder query when returning from ClickHouse', () => {
		const logsQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ dataSource: 'logs', legend: 'kept' }] },
		};
		mockBuilder(logsQuery);
		renderBuilder('signoz/TimeSeriesPanel');

		fireEvent.click(screen.getByText('ClickHouse Query'));
		const [onClickHouse] = redirectWithQueryBuilderData.mock.calls[0];
		expect(onClickHouse.queryType).toBe(EQueryType.CLICKHOUSE);
		// The builder slot already holds the Query Builder query — nothing to swap.
		expect(onClickHouse.builder).toBe(logsQuery.builder);
	});

	it('shows a fresh default query when leaving AI with nothing parked', () => {
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		fireEvent.click(screen.getByText('Query Builder'));

		const [next] = redirectWithQueryBuilderData.mock.calls[0];
		expect(next.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(next.builder.queryData[0].builderQueryType).toBeUndefined();
		expect(next.builder.queryData[0].dataSource).toBe('metrics');
	});

	it("keeps each tab's query across a round trip through the AI tab", () => {
		const logsQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ dataSource: 'logs' }] },
			clickhouse_sql: [{ query: 'SELECT 1' }],
		};
		const editor = (): JSX.Element => (
			<PanelEditorQueryBuilder
				panelDefinition={requireQueryPanelDefinition('signoz/TimeSeriesPanel')}
				isLoadingQueries={false}
				onStageRunQuery={jest.fn()}
				onCancelQuery={jest.fn()}
			/>
		);
		mockBuilder(logsQuery);
		const { rerender } = render(editor());

		fireEvent.click(screen.getByText('AI Query Builder'));
		const [aiQuery] = redirectWithQueryBuilderData.mock.calls[0];
		expect(aiQuery.builder.queryData[0].builderQueryType).toBe(
			'builder_ai_query',
		);
		expect(aiQuery.clickhouse_sql).toBe(logsQuery.clickhouse_sql);

		mockBuilder(aiQuery);
		rerender(editor());
		fireEvent.click(screen.getByText('Query Builder'));
		const [backToLogs] = redirectWithQueryBuilderData.mock.calls[1];
		expect(backToLogs.builder).toBe(logsQuery.builder);
		expect(backToLogs.clickhouse_sql).toBe(logsQuery.clickhouse_sql);

		mockBuilder(backToLogs);
		rerender(editor());
		fireEvent.click(screen.getByText('AI Query Builder'));
		const [backToAI] = redirectWithQueryBuilderData.mock.calls[2];
		expect(backToAI.builder).toBe(aiQuery.builder);
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

	it('marks List raw and leaves the field surface to the raw baseline', () => {
		renderBuilder('signoz/ListPanel');

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('list');
		expect(props.isRawQuery).toBe(true);
		expect(props.showTraceOperator).toBe(false);
		expect(props.fieldsConfig).toStrictEqual({});
	});
});
