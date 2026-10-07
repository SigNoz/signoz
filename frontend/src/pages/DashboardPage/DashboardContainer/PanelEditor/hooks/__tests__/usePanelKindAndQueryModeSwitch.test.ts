import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { handleQueryChange } from 'lib/query/panelQuery';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { resolveQueryMode } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { getBuilderQueries } from '../../../Panels/utils/getBuilderQueries';
import { toPerses } from '../../../queryV5/persesQueryAdapters';
import { getSwitchedPluginSpec } from '../../getSwitchedPluginSpec';
import { usePanelKindAndQueryModeSwitch } from '../usePanelKindAndQueryModeSwitch';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('lib/query/panelQuery', () => ({
	handleQueryChange: jest.fn(),
}));
jest.mock('../../../Panels/capabilities', () => ({
	resolveQueryMode: jest.fn(),
	getSupportedSignals: jest.fn(() => ['metrics']),
	getQueryPanelDefinition: jest.requireActual('../../../Panels/capabilities')
		.getQueryPanelDefinition,
	// Real predicate: these specs use real (query) kinds and the static path is
	// exercised through its own cases below.
	isStaticPanelKind: jest.requireActual('../../../Panels/capabilities')
		.isStaticPanelKind,
}));
jest.mock('../../../queryV5/persesQueryAdapters', () => ({
	toPerses: jest.fn(),
}));
jest.mock('../../getSwitchedPluginSpec', () => ({
	getSwitchedPluginSpec: jest.fn(),
}));
jest.mock('../../../Panels/utils/getBuilderQueries', () => ({
	getBuilderQueries: jest.fn(),
}));

const mockUseQueryBuilder = useQueryBuilder as unknown as jest.Mock;
const mockHandleQueryChange = handleQueryChange as unknown as jest.Mock;
const mockResolveQueryMode = resolveQueryMode as unknown as jest.Mock;
const mockToPerses = toPerses as unknown as jest.Mock;
const mockGetSwitchedPluginSpec = getSwitchedPluginSpec as unknown as jest.Mock;
const mockGetBuilderQueries = getBuilderQueries as unknown as jest.Mock;

// Opaque sentinels — the leaf utilities are mocked, so only identity matters.
const TABLE_PLUGIN_SPEC = { table: true } as unknown;
const TABLE_QUERIES = [{ id: 'table-q' }] as unknown as NonNullable<
	DashboardtypesPanelSpecDTO['queries']
>;
const LIST_PLUGIN_SPEC = { list: true } as unknown;
const LIST_QUERIES = [{ id: 'list-q' }] as unknown as NonNullable<
	DashboardtypesPanelSpecDTO['queries']
>;
const TRANSFORMED = {
	id: 'transformed',
	queryType: 'builder',
	builder: { queryData: [{ orderBy: [] }] },
} as unknown as Query;
const CONVERTED = [{ id: 'converted' }] as unknown as NonNullable<
	DashboardtypesPanelSpecDTO['queries']
>;
const SWITCHED_SPEC = { switched: true } as unknown;

function makeSpec(
	kind: string,
	pluginSpec: unknown,
	queries: NonNullable<DashboardtypesPanelSpecDTO['queries']>,
): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'Panel' },
		plugin: { kind, spec: pluginSpec },
		queries,
	} as unknown as DashboardtypesPanelSpecDTO;
}

const tableSpec = makeSpec(
	'signoz/TablePanel',
	TABLE_PLUGIN_SPEC,
	TABLE_QUERIES,
);
const listSpec = makeSpec('signoz/ListPanel', LIST_PLUGIN_SPEC, LIST_QUERIES);

function fakeQuery(
	id: string,
	queryType: string,
	queryData: Record<string, unknown>[] = [],
): Query {
	return { id, queryType, builder: { queryData } } as unknown as Query;
}

function builderState(currentQuery: Query): {
	currentQuery: Query;
	redirectWithQueryBuilderData: jest.Mock;
	updateAllQueriesOperators: jest.Mock;
} {
	return {
		currentQuery,
		redirectWithQueryBuilderData: jest.fn(),
		updateAllQueriesOperators: jest.fn((query: Query) => query),
	};
}

describe('usePanelKindAndQueryModeSwitch', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockHandleQueryChange.mockReturnValue(TRANSFORMED);
		mockToPerses.mockReturnValue(CONVERTED);
		mockGetSwitchedPluginSpec.mockReturnValue(SWITCHED_SPEC);
		mockGetBuilderQueries.mockReturnValue([{ signal: 'logs' }]);
		// The guard owns coercion (tested in capabilities.test.ts); here it always
		// resolves to Query Builder so the coerced type flows into handleQueryChange.
		mockResolveQueryMode.mockReturnValue('builder');
	});

	it('does nothing when switching to the current kind', () => {
		const setSpec = jest.fn();
		const state = builderState(fakeQuery('q', 'builder'));
		mockUseQueryBuilder.mockReturnValue(state);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: tableSpec,
				panelType: PANEL_TYPES.TABLE,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/TablePanel'));

		expect(setSpec).not.toHaveBeenCalled();
		expect(state.redirectWithQueryBuilderData).not.toHaveBeenCalled();
	});

	it('on first visit: transforms the query and resets the spec to the new kind', () => {
		const setSpec = jest.fn();
		const tableQuery = fakeQuery('table-current', 'builder');
		const state = builderState(tableQuery);
		mockUseQueryBuilder.mockReturnValue(state);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: tableSpec,
				panelType: PANEL_TYPES.TABLE,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		expect(setSpec).toHaveBeenCalledTimes(1);
		const next = setSpec.mock.calls[0][0] as DashboardtypesPanelSpecDTO;
		expect(next.plugin.kind).toBe('signoz/ListPanel');
		expect(next.plugin.spec).toBe(SWITCHED_SPEC);
		expect(next.queries).toBe(CONVERTED);
		const redirected = state.redirectWithQueryBuilderData.mock
			.calls[0][0] as Query;
		expect(redirected.builder.queryData[0].orderBy).toStrictEqual([
			{ columnName: 'timestamp', order: 'desc' },
		]);
	});

	it('seeds timestamp-desc Order By on every query when switching to a List panel', () => {
		const setSpec = jest.fn();
		mockUseQueryBuilder.mockReturnValue(
			builderState(fakeQuery('ts-current', 'builder')),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: { queryData: [{ orderBy: [] }, { orderBy: undefined }] },
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/TimeSeriesPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		const [persisted] = mockToPerses.mock.calls[0] as [Query];
		persisted.builder.queryData.forEach((qd) => {
			expect(qd.orderBy).toStrictEqual([
				{ columnName: 'timestamp', order: 'desc' },
			]);
		});
	});

	it('keeps one query and drops the formulas when switching to a Heatmap panel', () => {
		const setSpec = jest.fn();
		mockUseQueryBuilder.mockReturnValue(
			builderState(fakeQuery('ts-current', 'builder')),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: {
				queryData: [{ queryName: 'A' }, { queryName: 'B' }],
				queryFormulas: [{ queryName: 'F1' }],
			},
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/TimeSeriesPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/HeatmapPanel'));

		const [persisted] = mockToPerses.mock.calls[0] as [Query];
		expect(persisted.builder.queryData.map((qd) => qd.queryName)).toStrictEqual([
			'A',
		]);
		expect(persisted.builder.queryFormulas).toStrictEqual([]);
	});

	it('swaps a percentile spatial aggregation for count when switching to a Heatmap panel', () => {
		const setSpec = jest.fn();
		mockUseQueryBuilder.mockReturnValue(
			builderState(fakeQuery('ts-current', 'builder')),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: {
				queryData: [
					{
						queryName: 'A',
						spaceAggregation: 'p90',
						aggregations: [{ metricName: 'signoz_latency', spaceAggregation: 'p90' }],
					},
				],
				queryFormulas: [],
			},
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/TimeSeriesPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/HeatmapPanel'));

		const [persisted] = mockToPerses.mock.calls[0] as [Query];
		const [queryData] = persisted.builder.queryData;
		expect(queryData.spaceAggregation).toBe('count');
		expect(queryData.aggregations?.[0]).toStrictEqual({
			metricName: 'signoz_latency',
			spaceAggregation: 'count',
		});
	});

	it('swaps count back for a percentile when a histogram leaves a Heatmap panel', () => {
		const setSpec = jest.fn();
		mockUseQueryBuilder.mockReturnValue(
			builderState(fakeQuery('heatmap-current', 'builder')),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: {
				queryData: [
					{
						queryName: 'A',
						aggregateAttribute: { key: 'signoz_latency', type: 'Histogram' },
						spaceAggregation: 'count',
						aggregations: [
							{ metricName: 'signoz_latency', spaceAggregation: 'count' },
						],
					},
				],
				queryFormulas: [],
			},
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/HeatmapPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.HEATMAP,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/TimeSeriesPanel'));

		const [persisted] = mockToPerses.mock.calls[0] as [Query];
		const [queryData] = persisted.builder.queryData;
		expect(queryData.spaceAggregation).toBe('p90');
		expect(queryData.aggregations?.[0]).toStrictEqual({
			metricName: 'signoz_latency',
			spaceAggregation: 'p90',
		});
	});

	it('leaves a non-histogram metric on sum when it leaves a Heatmap panel', () => {
		const setSpec = jest.fn();
		mockUseQueryBuilder.mockReturnValue(
			builderState(fakeQuery('heatmap-current', 'builder')),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: {
				queryData: [
					{
						queryName: 'A',
						aggregateAttribute: { key: 'signoz_calls_total', type: 'Sum' },
						spaceAggregation: 'sum',
						aggregations: [
							{ metricName: 'signoz_calls_total', spaceAggregation: 'sum' },
						],
					},
				],
				queryFormulas: [],
			},
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/HeatmapPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.HEATMAP,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/TimeSeriesPanel'));

		const [persisted] = mockToPerses.mock.calls[0] as [Query];
		expect(persisted.builder.queryData[0].spaceAggregation).toBe('sum');
	});

	it('coerces the query type when the new kind disallows it (promql → List)', () => {
		const setSpec = jest.fn();
		const promQuery = fakeQuery('prom', 'promql');
		mockUseQueryBuilder.mockReturnValue(builderState(promQuery));

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: makeSpec('signoz/TimeSeriesPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		// The hook asks the guard to resolve the active query type against the new kind…
		expect(mockResolveQueryMode).toHaveBeenCalledWith(
			'signoz/ListPanel',
			'promql',
		);
		// …and the resolved type ('builder') flows into the query rebuild.
		const [, queryArg] = mockHandleQueryChange.mock.calls[0];
		expect((queryArg as Query).queryType).toBe('builder');
	});

	it('keeps the AI tag when the new kind supports AI', () => {
		const setSpec = jest.fn();
		const aiQuery = fakeQuery('ai', 'builder', [
			{ builderQueryType: 'builder_ai_query' },
		]);
		mockUseQueryBuilder.mockReturnValue(builderState(aiQuery));
		mockResolveQueryMode.mockReturnValue('builder_ai_query');

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: tableSpec,
				panelType: PANEL_TYPES.TABLE,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/TimeSeriesPanel'));

		const [, queryArg] = mockHandleQueryChange.mock.calls[0];
		expect((queryArg as Query).builder).toBe(aiQuery.builder);
		expect((queryArg as Query).builder.queryData[0].builderQueryType).toBe(
			'builder_ai_query',
		);
	});

	it('drops the AI tag when the new kind does not support AI', () => {
		const setSpec = jest.fn();
		const aiQuery = fakeQuery('ai', 'builder', [
			{ dataSource: 'traces', builderQueryType: 'builder_ai_query' },
		]);
		const state = builderState(aiQuery);
		mockUseQueryBuilder.mockReturnValue(state);
		mockHandleQueryChange.mockImplementation((_type, query) => query);
		// The guard coerces to Query Builder; the tag must not survive it.
		mockResolveQueryMode.mockReturnValue('builder');

		const { result } = renderHook(() =>
			usePanelKindAndQueryModeSwitch({
				spec: tableSpec,
				panelType: PANEL_TYPES.TABLE,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/TimeSeriesPanel'));

		const redirected = state.redirectWithQueryBuilderData.mock
			.calls[0][0] as Query;
		expect(redirected.builder.queryData[0].builderQueryType).toBeUndefined();
		expect(redirected.builder.queryData[0].dataSource).toBe('traces');
	});

	it('stays on the AI tab when returning to a kind last left on Query Builder', () => {
		const setSpec = jest.fn();
		const qbQuery = fakeQuery('qb', 'builder', [{ dataSource: 'logs' }]);
		const aiQuery = fakeQuery('ai', 'builder', [
			{ dataSource: 'traces', builderQueryType: 'builder_ai_query' },
		]);
		let state = builderState(qbQuery);
		mockUseQueryBuilder.mockImplementation(() => state);
		mockHandleQueryChange.mockImplementation((_type, query) => query);

		const { result, rerender } = renderHook(
			(props: { spec: DashboardtypesPanelSpecDTO; panelType: PANEL_TYPES }) =>
				usePanelKindAndQueryModeSwitch({ ...props, setSpec }),
			{ initialProps: { spec: tableSpec, panelType: PANEL_TYPES.TABLE } },
		);

		// Leave Table on Query Builder — its stash holds the QB query.
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		// On List the user moves to the AI tab, then returns to Table.
		state = builderState(aiQuery);
		mockResolveQueryMode.mockReturnValue('builder_ai_query');
		rerender({ spec: listSpec, panelType: PANEL_TYPES.LIST });
		act(() => result.current.onChangePanelKind('signoz/TablePanel'));

		const redirected = state.redirectWithQueryBuilderData.mock
			.calls[0][0] as Query;
		expect(redirected.builder.queryData[0].builderQueryType).toBe(
			'builder_ai_query',
		);
		const restored = setSpec.mock.calls[
			setSpec.mock.calls.length - 1
		][0] as DashboardtypesPanelSpecDTO;
		// The kind's own display spec still comes back; only the query follows the tab.
		expect(restored.plugin.spec).toBe(TABLE_PLUGIN_SPEC);
		expect(restored.queries).toBe(CONVERTED);

		// Table's Query Builder query waited behind the AI tab — the tab switch gives it back.
		act(() => result.current.onChangeQueryMode('builder'));
		const backToQB = state.redirectWithQueryBuilderData.mock.calls[1][0] as Query;
		expect(backToQB.builder).toBe(qbQuery.builder);
	});

	describe('both builder tabs, per kind', () => {
		const qbQuery = fakeQuery('qb', 'builder', [{ dataSource: 'logs' }]);
		const aiQuery = fakeQuery('ai', 'builder', [
			{ dataSource: 'traces', builderQueryType: 'builder_ai_query' },
		]);

		// Table gets a Query Builder query and an AI one; the user leaves it on AI for List.
		function leaveTableOnAI(): {
			result: { current: ReturnType<typeof usePanelKindAndQueryModeSwitch> };
			rerender: (props: {
				spec: DashboardtypesPanelSpecDTO;
				panelType: PANEL_TYPES;
			}) => void;
			setSpec: jest.Mock;
			setState: (query: Query) => ReturnType<typeof builderState>;
		} {
			const setSpec = jest.fn();
			let state = builderState(qbQuery);
			mockUseQueryBuilder.mockImplementation(() => state);
			mockHandleQueryChange.mockImplementation((_type, query) => query);
			const { result, rerender } = renderHook(
				(props: { spec: DashboardtypesPanelSpecDTO; panelType: PANEL_TYPES }) =>
					usePanelKindAndQueryModeSwitch({ ...props, setSpec }),
				{ initialProps: { spec: tableSpec, panelType: PANEL_TYPES.TABLE } },
			);
			const setState = (query: Query): ReturnType<typeof builderState> => {
				state = builderState(query);
				return state;
			};

			act(() => result.current.onChangeQueryMode('builder_ai_query'));
			setState(aiQuery);
			rerender({ spec: tableSpec, panelType: PANEL_TYPES.TABLE });
			mockResolveQueryMode.mockReturnValue('builder_ai_query');
			act(() => result.current.onChangePanelKind('signoz/ListPanel'));
			return { result, rerender, setSpec, setState };
		}

		it('rebuilds the parked query for the new kind on a first visit', () => {
			const { result } = leaveTableOnAI();

			// Table's Query Builder query was rebuilt for List, and is one tab away there.
			expect(mockHandleQueryChange).toHaveBeenCalledWith(
				'list',
				expect.objectContaining({ builder: qbQuery.builder }),
				PANEL_TYPES.TABLE,
			);
			act(() => result.current.onChangeQueryMode('builder'));
			const { redirectWithQueryBuilderData } =
				mockUseQueryBuilder.mock.results[
					mockUseQueryBuilder.mock.results.length - 1
				].value;
			const backToQB = redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0] as Query;
			expect(backToQB.builder.queryData[0].dataSource).toBe('logs');
			expect(backToQB.builder.queryData[0].builderQueryType).toBeUndefined();
		});

		it("brings back both tabs' queries when revisiting a kind", () => {
			const { result, rerender, setSpec, setState } = leaveTableOnAI();

			// Back to Table from List, still on the AI tab.
			const state = setState(
				fakeQuery('list-ai', 'builder', [
					{ dataSource: 'traces', builderQueryType: 'builder_ai_query' },
				]),
			);
			rerender({ spec: listSpec, panelType: PANEL_TYPES.LIST });
			act(() => result.current.onChangePanelKind('signoz/TablePanel'));

			const restored = state.redirectWithQueryBuilderData.mock
				.calls[0][0] as Query;
			expect(restored.builder).toBe(aiQuery.builder);
			const restoredSpec = setSpec.mock.calls[
				setSpec.mock.calls.length - 1
			][0] as DashboardtypesPanelSpecDTO;
			expect(restoredSpec.plugin.spec).toBe(TABLE_PLUGIN_SPEC);
			expect(restoredSpec.queries).toBe(TABLE_QUERIES);

			// Table's Query Builder query is one tab away.
			act(() => result.current.onChangeQueryMode('builder'));
			const backToQB = state.redirectWithQueryBuilderData.mock
				.calls[1][0] as Query;
			expect(backToQB.builder).toBe(qbQuery.builder);
		});

		it('swaps in the Query Builder query when revisiting a kind left on AI', () => {
			const { result, rerender, setSpec, setState } = leaveTableOnAI();

			// On List the user is back on Query Builder, then returns to Table.
			const state = setState(
				fakeQuery('list-qb', 'builder', [{ dataSource: 'logs' }]),
			);
			mockResolveQueryMode.mockReturnValue('builder');
			rerender({ spec: listSpec, panelType: PANEL_TYPES.LIST });
			act(() => result.current.onChangePanelKind('signoz/TablePanel'));

			const restored = state.redirectWithQueryBuilderData.mock
				.calls[0][0] as Query;
			expect(restored.builder).toBe(qbQuery.builder);
			// The stashed preview queries were the AI query's; they're rebuilt for the swap.
			const restoredSpec = setSpec.mock.calls[
				setSpec.mock.calls.length - 1
			][0] as DashboardtypesPanelSpecDTO;
			expect(restoredSpec.queries).toBe(CONVERTED);

			// Table's AI query is one tab away.
			act(() => result.current.onChangeQueryMode('builder_ai_query'));
			const backToAI = state.redirectWithQueryBuilderData.mock
				.calls[1][0] as Query;
			expect(backToAI.builder).toBe(aiQuery.builder);
		});
	});

	it('restores the original kind verbatim on switch-back (reversibility)', () => {
		const setSpec = jest.fn();
		const tableQuery = fakeQuery('table-current', 'builder');
		const listQuery = fakeQuery('list-current', 'builder');
		let state = builderState(tableQuery);
		mockUseQueryBuilder.mockImplementation(() => state);

		const { result, rerender } = renderHook(
			(props: { spec: DashboardtypesPanelSpecDTO; panelType: PANEL_TYPES }) =>
				usePanelKindAndQueryModeSwitch({ ...props, setSpec }),
			{ initialProps: { spec: tableSpec, panelType: PANEL_TYPES.TABLE } },
		);

		// Leave Table for List (stashes Table in its pristine state).
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		// Parent re-renders as a List panel; the builder now holds the List query.
		state = builderState(listQuery);
		rerender({ spec: listSpec, panelType: PANEL_TYPES.LIST });

		// Switch back to Table → restored from the stash, not re-transformed.
		act(() => result.current.onChangePanelKind('signoz/TablePanel'));

		const restored = setSpec.mock.calls[
			setSpec.mock.calls.length - 1
		][0] as DashboardtypesPanelSpecDTO;
		expect(restored.plugin.kind).toBe('signoz/TablePanel');
		expect(restored.plugin.spec).toBe(TABLE_PLUGIN_SPEC);
		expect(restored.queries).toBe(TABLE_QUERIES);
		expect(state.redirectWithQueryBuilderData).toHaveBeenCalledWith(tableQuery);
		// The restore path must not run the query transform again.
		expect(mockHandleQueryChange).toHaveBeenCalledTimes(1);
	});
});
