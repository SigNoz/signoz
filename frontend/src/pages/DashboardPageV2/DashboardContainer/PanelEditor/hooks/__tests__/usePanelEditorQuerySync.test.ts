import { renderHook } from '@testing-library/react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getIsQueryModified } from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { fromPerses, toPerses } from '../../../queryV5/persesQueryAdapters';
import { usePanelEditorQuerySync } from '../usePanelEditorQuerySync';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('hooks/queryBuilder/useShareBuilderUrl', () => ({
	useShareBuilderUrl: jest.fn(),
}));
jest.mock('container/NewWidget/utils', () => ({
	getIsQueryModified: jest.fn(),
}));
jest.mock('../../../queryV5/persesQueryAdapters', () => ({
	fromPerses: jest.fn(),
	toPerses: jest.fn(),
}));
// commitQuery's no-op guard compares queries at the envelope level; with the
// adapters mocked, unwrap identity-style so the opaque fixtures stay distinct
// (CONVERTED vs SAVED) and the commit decisions are what's under test.
jest.mock('../../../queryV5/buildQueryRangeRequest', () => ({
	toQueryEnvelopes: jest.fn((queries: unknown) => queries),
}));

const mockUseQueryBuilder = useQueryBuilder as unknown as jest.Mock;
const mockUseShareBuilderUrl = useShareBuilderUrl as unknown as jest.Mock;
const mockGetIsQueryModified = getIsQueryModified as unknown as jest.Mock;
const mockFromPerses = fromPerses as unknown as jest.Mock;
const mockToPerses = toPerses as unknown as jest.Mock;

// Opaque fixtures — the adapters are mocked, so only identity matters here.
const SAVED_QUERIES = [{ id: 'saved' }] as unknown as NonNullable<
	DashboardtypesPanelSpecDTO['queries']
>;
const CONVERTED_QUERIES = [{ id: 'converted' }] as unknown as NonNullable<
	DashboardtypesPanelSpecDTO['queries']
>;
const SEED_V1 = { id: 'seed', queryType: 'builder' } as unknown as Query;
const STAGED_V1 = { id: 'staged', queryType: 'builder' } as unknown as Query;

function makeDraft(
	queries = SAVED_QUERIES,
	kind = 'signoz/TimeSeriesPanel',
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'Panel' },
			plugin: { kind, spec: {} },
			queries,
		},
	} as unknown as DashboardtypesPanelDTO;
}

function builderState(
	overrides: Partial<{
		currentQuery: Query;
		stagedQuery: Query | null;
		handleRunQuery: jest.Mock;
	}> = {},
): {
	currentQuery: Query;
	stagedQuery: Query | null;
	handleRunQuery: jest.Mock;
} {
	return {
		currentQuery: { id: 'current', queryType: 'builder' } as unknown as Query,
		stagedQuery: STAGED_V1,
		handleRunQuery: jest.fn(),
		...overrides,
	};
}

describe('usePanelEditorQuerySync', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockFromPerses.mockReturnValue(SEED_V1);
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);
		mockGetIsQueryModified.mockReturnValue(false);
		mockUseQueryBuilder.mockReturnValue(builderState());
	});

	function setup(
		opts: {
			draft?: DashboardtypesPanelDTO;
			setSpec?: jest.Mock;
			refetch?: jest.Mock;
		} = {},
	): {
		result: {
			current: {
				runQuery: () => void;
				isQueryDirty: boolean;
				buildSaveSpec: (
					spec: DashboardtypesPanelSpecDTO,
				) => DashboardtypesPanelSpecDTO;
			};
		};
		setSpec: jest.Mock;
		refetch: jest.Mock;
		rerender: () => void;
	} {
		const setSpec = opts.setSpec ?? jest.fn();
		const refetch = opts.refetch ?? jest.fn();
		const draft = opts.draft ?? makeDraft();
		const { result, rerender } = renderHook(() =>
			usePanelEditorQuerySync({
				draft,
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
				refetch,
			}),
		);
		return { result, setSpec, refetch, rerender };
	}

	it('force-resets the builder to the saved queries on mount (discards stale URL)', () => {
		setup();
		expect(mockFromPerses).toHaveBeenCalledWith(
			SAVED_QUERIES,
			PANEL_TYPES.TIME_SERIES,
		);
		expect(mockUseShareBuilderUrl).toHaveBeenCalledWith({
			defaultValue: SEED_V1,
			forceReset: true,
		});
	});

	it('does not touch the draft on mount for an unedited panel', () => {
		const { setSpec, refetch } = setup();
		// Mount runs the type-change effect once; an unedited query must no-op.
		expect(setSpec).not.toHaveBeenCalled();
		expect(refetch).not.toHaveBeenCalled();
	});

	it('compares the live query against the saved query (seed), not the staged query', () => {
		const currentQuery = { id: 'current', queryType: 'builder' } as Query;
		mockUseQueryBuilder.mockReturnValue(builderState({ currentQuery }));

		const { result } = setup();
		result.current.runQuery();

		// Baseline is the saved seed — a stale staged/URL query must not be the
		// reference, or a real datasource switch would read as "unchanged".
		expect(mockGetIsQueryModified).toHaveBeenCalledWith(currentQuery, SEED_V1);
	});

	describe('runQuery', () => {
		it('stages the query (handleRunQuery)', () => {
			const handleRunQuery = jest.fn();
			mockUseQueryBuilder.mockReturnValue(builderState({ handleRunQuery }));
			const { result } = setup();

			result.current.runQuery();

			expect(handleRunQuery).toHaveBeenCalledTimes(1);
		});

		it('commits a modified query into the draft and does not force a refetch', () => {
			mockGetIsQueryModified.mockReturnValue(true);
			const { result, setSpec, refetch } = setup();

			result.current.runQuery();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
			expect(refetch).not.toHaveBeenCalled();
		});

		it('forces a refetch and leaves the draft alone when the query is unchanged', () => {
			mockGetIsQueryModified.mockReturnValue(false);
			const { result, setSpec, refetch } = setup();

			result.current.runQuery();

			expect(setSpec).not.toHaveBeenCalled();
			expect(refetch).toHaveBeenCalledTimes(1);
		});

		it('commits a datasource switch even when the staged query is stale (no revert to saved)', () => {
			// A stale staged query (e.g. URL-restored after refresh) must not be used
			// as the baseline; the switch is detected against the saved seed and the
			// live query is committed so the preview fetches it.
			mockUseQueryBuilder.mockReturnValue(builderState({ stagedQuery: null }));
			mockGetIsQueryModified.mockReturnValue(true);
			const { result, setSpec, refetch } = setup();

			result.current.runQuery();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
			expect(refetch).not.toHaveBeenCalled();
		});
	});

	describe('query-type switch', () => {
		it('commits the active query when the query type changes', () => {
			const state = builderState({
				currentQuery: { id: 'a', queryType: 'builder' } as Query,
			});
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Switch query type → the effect should commit.
			state.currentQuery = { id: 'b', queryType: 'promql' } as Query;
			rerender();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
		});

		it('does not commit when the active query type is unchanged', () => {
			const state = builderState({
				currentQuery: { id: 'a', queryType: 'builder' } as Query,
			});
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Same query type, different object → effect must not re-fire.
			state.currentQuery = { id: 'b', queryType: 'builder' } as Query;
			rerender();

			expect(setSpec).not.toHaveBeenCalled();
		});
	});

	describe('datasource switch', () => {
		const withSource = (id: string, ...dataSources: string[]): Query =>
			({
				id,
				queryType: 'builder',
				builder: {
					queryData: dataSources.map((dataSource) => ({ dataSource })),
				},
			}) as unknown as Query;

		it('commits the active query when a query datasource changes', () => {
			const state = builderState({ currentQuery: withSource('a', 'logs') });
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Switch datasource logs → traces → the effect should commit (→ refetch).
			state.currentQuery = withSource('b', 'traces');
			rerender();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
		});

		it('does not commit when the datasource is unchanged', () => {
			const state = builderState({ currentQuery: withSource('a', 'logs') });
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Same datasource, different object → effect must not re-fire.
			state.currentQuery = withSource('b', 'logs');
			rerender();

			expect(setSpec).not.toHaveBeenCalled();
		});

		it('does not commit when a query is added (the fresh query must not auto-run)', () => {
			const state = builderState({ currentQuery: withSource('a', 'metrics') });
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			state.currentQuery = withSource('b', 'metrics', 'metrics');
			rerender();

			expect(setSpec).not.toHaveBeenCalled();
		});

		it('commits when a query is removed', () => {
			const state = builderState({
				currentQuery: withSource('a', 'metrics', 'logs'),
			});
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			state.currentQuery = withSource('b', 'metrics');
			rerender();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
		});

		it('commits a datasource switch on a query added after mount', () => {
			const state = builderState({ currentQuery: withSource('a', 'metrics') });
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			state.currentQuery = withSource('b', 'metrics', 'metrics');
			rerender();
			state.currentQuery = withSource('c', 'metrics', 'logs');
			rerender();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
		});
	});

	describe('query dirty + save', () => {
		it('compares the live query against the builder baseline (first staged query), not the raw seed', () => {
			mockGetIsQueryModified.mockReturnValue(true);
			const { result } = setup();

			// Baseline is the builder's own normalized staged query — immune to the
			// raw-seed vs builder-normalized serialization drift.
			expect(mockGetIsQueryModified).toHaveBeenCalledWith(
				expect.anything(),
				STAGED_V1,
			);
			expect(result.current.isQueryDirty).toBe(true);
		});

		it('is not query-dirty when the live query matches the baseline', () => {
			mockGetIsQueryModified.mockReturnValue(false);
			const { result } = setup();

			expect(result.current.isQueryDirty).toBe(false);
		});

		it('buildSaveSpec bakes the live query in when dirty', () => {
			mockGetIsQueryModified.mockReturnValue(true);
			const { result } = setup();
			const { spec } = makeDraft();

			expect(result.current.buildSaveSpec(spec)).toStrictEqual({
				...spec,
				queries: CONVERTED_QUERIES,
			});
		});

		it('buildSaveSpec returns the spec untouched when the query is unchanged', () => {
			mockGetIsQueryModified.mockReturnValue(false);
			const { result } = setup();
			const { spec } = makeDraft();

			expect(result.current.buildSaveSpec(spec)).toBe(spec);
		});
	});
});
