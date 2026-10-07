import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { requireQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import {
	toPanelType,
	type PanelKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import type { BuilderStash } from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';

import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder';
import { useQueryModeChange } from '../../hooks/useQueryModeChange';

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

/** Stands in for the editor shell: owns the tab switch and its parked Query Builder query. */
function BuilderHost({ panelKind }: { panelKind: PanelKind }): JSX.Element {
	const panelDefinition = requireQueryPanelDefinition(panelKind);
	const parkedBuilders = useRef<BuilderStash>({});
	const onChangeQueryMode = useQueryModeChange({
		panelType: toPanelType(panelKind),
		supportedQueryModes: panelDefinition.supportedQueryModes,
		parkedBuilders,
	});
	return (
		<PanelEditorQueryBuilder
			panelDefinition={panelDefinition}
			onChangeQueryMode={onChangeQueryMode}
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
	});

	it('activates the AI tab for an AI query and pins the builder to traces', () => {
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		expect(
			screen.getByRole('tab', { name: 'AI Query Builder', selected: true }),
		).toBeInTheDocument();
		expect(lastQueryBuilderProps()).toMatchObject({
			config: { initialDataSource: 'traces', queryVariant: 'static' },
			showTraceOperator: false,
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

	it('shows a fresh default query when leaving AI', () => {
		mockBuilder(AI_QUERY);
		renderBuilder('signoz/TimeSeriesPanel');

		fireEvent.click(screen.getByText('Query Builder'));

		const [next] = redirectWithQueryBuilderData.mock.calls[0];
		expect(next.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(next.builder.queryData[0].builderQueryType).toBeUndefined();
		expect(next.builder.queryData[0].dataSource).toBe('metrics');
	});

	it("keeps each tab's own query across Query Builder ↔ AI round trips", () => {
		const logsQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: { queryData: [{ dataSource: 'logs' }] },
		};
		const host = (): JSX.Element => (
			<BuilderHost panelKind="signoz/TimeSeriesPanel" />
		);
		mockBuilder(logsQuery);
		const { rerender } = render(host());

		fireEvent.click(screen.getByText('AI Query Builder'));
		const [aiQuery] = redirectWithQueryBuilderData.mock.calls[0];
		// The user writes an AI query, then goes back to Query Builder.
		const editedAIBuilder = {
			queryData: [{ dataSource: 'traces', builderQueryType: 'builder_ai_query' }],
		};
		mockBuilder({ ...aiQuery, builder: editedAIBuilder });
		rerender(host());
		fireEvent.click(screen.getByText('Query Builder'));
		const [backToQB] = redirectWithQueryBuilderData.mock.calls[1];
		expect(backToQB.builder).toBe(logsQuery.builder);

		mockBuilder(backToQB);
		rerender(host());
		fireEvent.click(screen.getByText('AI Query Builder'));
		const [backToAI] = redirectWithQueryBuilderData.mock.calls[2];
		expect(backToAI.builder).toBe(editedAIBuilder);
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

	it('offers metrics alone for the Heatmap kind — the only signal with a bucket axis', () => {
		renderBuilder('signoz/HeatmapPanel');

		expect(lastQueryBuilderProps().allowedDataSources).toStrictEqual(['metrics']);
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
