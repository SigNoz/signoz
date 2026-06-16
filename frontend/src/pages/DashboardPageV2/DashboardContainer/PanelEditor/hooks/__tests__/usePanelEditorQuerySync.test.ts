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
		result: { current: { runQuery: () => void } };
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

	it('seeds the builder from the saved queries via the URL', () => {
		setup();
		expect(mockFromPerses).toHaveBeenCalledWith(
			SAVED_QUERIES,
			PANEL_TYPES.TIME_SERIES,
		);
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

	it('compares the live query against the provider baseline (first stagedQuery)', () => {
		const currentQuery = { id: 'current', queryType: 'builder' } as Query;
		mockUseQueryBuilder.mockReturnValue(builderState({ currentQuery }));

		const { result } = setup();
		result.current.runQuery();

		expect(mockGetIsQueryModified).toHaveBeenCalledWith(currentQuery, STAGED_V1);
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
});
