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
			savedQueries?: DashboardtypesPanelSpecDTO['queries'];
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
				savedQueries: opts.savedQueries,
			}),
		);
		return { result, setSpec, refetch, rerender };
	}

	it('seeds the builder from the draft queries on mount (URL query, when present, wins)', () => {
		setup();
		expect(mockFromPerses).toHaveBeenCalledWith(
			SAVED_QUERIES,
			PANEL_TYPES.TIME_SERIES,
		);
		// No forceReset: useShareBuilderUrl resets to the seed only when the URL carries
		// no query, so an in-editor edit in the URL survives a refresh.
		expect(mockUseShareBuilderUrl).toHaveBeenCalledWith({
			defaultValue: SEED_V1,
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

	describe('staged-query re-sync (browser back/forward)', () => {
		it('commits the staged query into the draft when it re-stages', () => {
			const state = builderState();
			mockUseQueryBuilder.mockImplementation(() => state);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Browser Back re-stages a different query via initQueryBuilderData; the
			// preview must follow it instead of keeping the last Run's result.
			mockGetIsQueryModified.mockReturnValue(true);
			state.stagedQuery = {
				id: 'restaged',
				queryType: 'builder',
			} as unknown as Query;
			rerender();

			expect(setSpec).toHaveBeenCalledWith({
				...makeDraft().spec,
				queries: CONVERTED_QUERIES,
			});
		});

		it('does not commit when only the live query changes (no re-stage)', () => {
			const state = builderState({
				currentQuery: { id: 'a', queryType: 'builder' } as Query,
			});
			mockUseQueryBuilder.mockImplementation(() => state);
			mockGetIsQueryModified.mockReturnValue(true);

			const { setSpec, rerender } = setup();
			setSpec.mockClear();

			// Live edit: currentQuery changes, staged query + structure unchanged.
			state.currentQuery = { id: 'b', queryType: 'builder' } as Query;
			rerender();

			expect(setSpec).not.toHaveBeenCalled();
		});
	});

	describe('query dirty + save', () => {
		// isQueryDirty compares the live query to the SAVED queries at the V5 envelope
		// level (toQueryEnvelopes is mocked identity). Drive it via an input-sensitive
		// toPerses so the envelope comparison — not getIsQueryModified — decides.
		const SAVED_BASELINE = [{ id: 'saved-baseline' }] as unknown as NonNullable<
			DashboardtypesPanelSpecDTO['queries']
		>;
		const EDITED_ENVELOPES = [
			{ id: 'edited-envelopes' },
		] as unknown as NonNullable<DashboardtypesPanelSpecDTO['queries']>;
		const editedQuery = { id: 'edited', queryType: 'builder' } as Query;
		const unchangedQuery = { id: 'unchanged', queryType: 'builder' } as Query;

		beforeEach(() => {
			mockToPerses.mockImplementation((query: Query) =>
				query?.id === 'edited' ? EDITED_ENVELOPES : SAVED_BASELINE,
			);
		});

		it('is query-dirty when the live query no longer serializes to the saved queries', () => {
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: editedQuery }),
			);
			const { result } = setup({ savedQueries: SAVED_BASELINE });

			expect(result.current.isQueryDirty).toBe(true);
		});

		it('is not query-dirty when the live query still serializes to the saved queries', () => {
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: unchangedQuery }),
			);
			const { result } = setup({ savedQueries: SAVED_BASELINE });

			expect(result.current.isQueryDirty).toBe(false);
		});

		it('buildSaveSpec bakes the live query in when dirty', () => {
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: editedQuery }),
			);
			const { result } = setup({ savedQueries: SAVED_BASELINE });
			const { spec } = makeDraft();

			expect(result.current.buildSaveSpec(spec)).toStrictEqual({
				...spec,
				queries: EDITED_ENVELOPES,
			});
		});

		it('buildSaveSpec returns the spec untouched when the query is unchanged', () => {
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: unchangedQuery }),
			);
			const { result } = setup({ savedQueries: SAVED_BASELINE });
			const { spec } = makeDraft();

			expect(result.current.buildSaveSpec(spec)).toBe(spec);
		});

		it('anchors the baseline to savedQueries, not the draft the builder seeds from (View handoff / refresh)', () => {
			// The draft carries the View-mode edit (the builder seeds from it), but the
			// baseline is the persisted panel: a live query equal to the edited draft
			// still reads dirty against the saved queries.
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: editedQuery }),
			);
			const draft = makeDraft(EDITED_ENVELOPES);
			const { result } = setup({ draft, savedQueries: SAVED_BASELINE });

			expect(result.current.isQueryDirty).toBe(true);
		});

		it('falls back to the seed query as the baseline when there are no saved queries (new panel)', () => {
			mockUseQueryBuilder.mockReturnValue(
				builderState({ currentQuery: unchangedQuery }),
			);
			const { result } = setup();

			expect(result.current.isQueryDirty).toBe(false);
		});
	});
});
