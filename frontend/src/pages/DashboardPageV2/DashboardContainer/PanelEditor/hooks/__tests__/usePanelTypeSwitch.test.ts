import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { handleQueryChange } from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { resolveQueryType } from '../../../Panels/capabilities';
import { getBuilderQueries } from '../../../Panels/utils/getBuilderQueries';
import { toPerses } from '../../../queryV5/persesQueryAdapters';
import { getSwitchedPluginSpec } from '../../getSwitchedPluginSpec';
import { usePanelTypeSwitch } from '../usePanelTypeSwitch';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('container/NewWidget/utils', () => ({
	handleQueryChange: jest.fn(),
}));
jest.mock('../../../Panels/capabilities', () => ({
	resolveQueryType: jest.fn(),
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
const mockResolveQueryType = resolveQueryType as unknown as jest.Mock;
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

function builderState(currentQuery: Query): {
	currentQuery: Query;
	redirectWithQueryBuilderData: jest.Mock;
} {
	return { currentQuery, redirectWithQueryBuilderData: jest.fn() };
}

describe('usePanelTypeSwitch', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockHandleQueryChange.mockReturnValue(TRANSFORMED);
		mockToPerses.mockReturnValue(CONVERTED);
		mockGetSwitchedPluginSpec.mockReturnValue(SWITCHED_SPEC);
		mockGetBuilderQueries.mockReturnValue([{ signal: 'logs' }]);
		// The guard owns coercion (tested in capabilities.test.ts); here it always
		// resolves to Query Builder so the coerced type flows into handleQueryChange.
		mockResolveQueryType.mockReturnValue('builder');
	});

	it('does nothing when switching to the current kind', () => {
		const setSpec = jest.fn();
		const state = builderState({ id: 'q', queryType: 'builder' } as Query);
		mockUseQueryBuilder.mockReturnValue(state);

		const { result } = renderHook(() =>
			usePanelTypeSwitch({
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
		const tableQuery = { id: 'table-current', queryType: 'builder' } as Query;
		const state = builderState(tableQuery);
		mockUseQueryBuilder.mockReturnValue(state);

		const { result } = renderHook(() =>
			usePanelTypeSwitch({
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
			builderState({ id: 'ts-current', queryType: 'builder' } as Query),
		);
		mockHandleQueryChange.mockReturnValue({
			id: 'transformed',
			queryType: 'builder',
			builder: { queryData: [{ orderBy: [] }, { orderBy: undefined }] },
		} as unknown as Query);

		const { result } = renderHook(() =>
			usePanelTypeSwitch({
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

	it('coerces the query type when the new kind disallows it (promql → List)', () => {
		const setSpec = jest.fn();
		const promQuery = { id: 'prom', queryType: 'promql' } as Query;
		mockUseQueryBuilder.mockReturnValue(builderState(promQuery));

		const { result } = renderHook(() =>
			usePanelTypeSwitch({
				spec: makeSpec('signoz/TimeSeriesPanel', {}, TABLE_QUERIES),
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec,
			}),
		);
		act(() => result.current.onChangePanelKind('signoz/ListPanel'));

		// The hook asks the guard to resolve the active query type against the new kind…
		expect(mockResolveQueryType).toHaveBeenCalledWith(
			'signoz/ListPanel',
			'promql',
		);
		// …and the resolved type ('builder') flows into the query rebuild.
		const [, queryArg] = mockHandleQueryChange.mock.calls[0];
		expect((queryArg as Query).queryType).toBe('builder');
	});

	it('restores the original kind verbatim on switch-back (reversibility)', () => {
		const setSpec = jest.fn();
		const tableQuery = { id: 'table-current', queryType: 'builder' } as Query;
		const listQuery = { id: 'list-current', queryType: 'builder' } as Query;
		let state = builderState(tableQuery);
		mockUseQueryBuilder.mockImplementation(() => state);

		const { result, rerender } = renderHook(
			(props: { spec: DashboardtypesPanelSpecDTO; panelType: PANEL_TYPES }) =>
				usePanelTypeSwitch({ ...props, setSpec }),
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
