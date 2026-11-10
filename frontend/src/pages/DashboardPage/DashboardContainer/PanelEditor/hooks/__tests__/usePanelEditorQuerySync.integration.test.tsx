import { renderHook, waitFor } from '@testing-library/react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesQueryDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { AllTheProviders } from 'tests/test-utils';

import { fromPerses, toPerses } from '../../../queryV5/persesQueryAdapters';
import { usePanelEditorQuerySync } from '../usePanelEditorQuerySync';

// Exercises the REAL query builder provider (not mocks) so the dirty check is
// verified against the builder's actual re-serialization — the "always dirty"
// regression only reproduces with the real normalization in the loop.

const panelType = PANEL_TYPES.TIME_SERIES;

function makeSavedQueries(): DashboardtypesQueryDTO[] {
	const base: Query = {
		...initialQueriesMap[DataSource.METRICS],
		builder: {
			...initialQueriesMap[DataSource.METRICS].builder,
			queryData: [
				{
					...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
					legend: 'cpu',
				},
			],
		},
	};
	return toPerses(base, panelType);
}

function makePanel(queries: DashboardtypesQueryDTO[]): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'CPU' },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries,
		},
	} as unknown as DashboardtypesPanelDTO;
}

/** Providers whose URL already carries `query` as the compositeQuery param (a mid-edit refresh). */
function makeUrlWrapper(
	query: Query,
): ({ children }: { children: React.ReactNode }) => JSX.Element {
	const params = new URLSearchParams();
	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(query)),
	);
	return function UrlWrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return (
			<AllTheProviders initialRoute={`/?${params.toString()}`}>
				{children}
			</AllTheProviders>
		);
	};
}

describe('usePanelEditorQuerySync (real query builder)', () => {
	it('an untouched existing panel is NOT query-dirty on mount', async () => {
		const saved = makeSavedQueries();
		const { result } = renderHook(
			() =>
				usePanelEditorQuerySync({
					draft: makePanel(saved),
					panelType,
					setSpec: jest.fn(),
					refetch: jest.fn(),
					savedQueries: saved,
				}),
			{ wrapper: AllTheProviders },
		);

		// The builder force-resets to the saved query asynchronously; once settled the
		// live query must serialize back to the saved queries → clean.
		await waitFor(() => expect(result.current.isQueryDirty).toBe(false));
		// And stays clean (no late re-stage flips it dirty).
		expect(result.current.isQueryDirty).toBe(false);
	});

	it.each([
		[DataSource.METRICS, PANEL_TYPES.TIME_SERIES],
		[DataSource.LOGS, PANEL_TYPES.TIME_SERIES],
		[DataSource.TRACES, PANEL_TYPES.TIME_SERIES],
		[DataSource.LOGS, PANEL_TYPES.LIST],
	])(
		'a NEW %s panel (%s, no savedQueries) is NOT query-dirty on mount',
		async (ds, pt) => {
			const { result } = renderHook(
				() =>
					usePanelEditorQuerySync({
						draft: makePanel([]),
						panelType: pt,
						setSpec: jest.fn(),
						refetch: jest.fn(),
						alwaysSerializeQuery: true,
						signal: ds as unknown as TelemetrytypesSignalDTO,
						// savedQueries omitted — new panel.
					}),
				{ wrapper: AllTheProviders },
			);

			await waitFor(() => expect(result.current.isQueryDirty).toBe(false));
			expect(result.current.isQueryDirty).toBe(false);
		},
	);

	it('a NEW panel stays query-dirty after Stage & Run commits the edited query into the draft', async () => {
		// Repro of the P0: new panel → edit → Run commits the query into the draft; the
		// dirty baseline must not drift onto it, or Save re-disables.
		const editedInUrl: Query = {
			...initialQueriesMap[DataSource.METRICS],
			id: 'edited-new-panel',
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [
					{
						...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
						legend: 'edited-legend',
					},
				],
			},
		};
		const committed = toPerses(editedInUrl, panelType);

		const { result, rerender } = renderHook(
			({ draftQueries }: { draftQueries: DashboardtypesQueryDTO[] }) =>
				usePanelEditorQuerySync({
					draft: makePanel(draftQueries),
					panelType,
					setSpec: jest.fn(),
					refetch: jest.fn(),
					alwaysSerializeQuery: true,
					signal: DataSource.METRICS as unknown as TelemetrytypesSignalDTO,
					// savedQueries omitted — new panel.
				}),
			{
				wrapper: makeUrlWrapper(editedInUrl),
				initialProps: { draftQueries: [] as DashboardtypesQueryDTO[] },
			},
		);

		// The edited query (from the URL) diverges from the seeded default → dirty.
		await waitFor(() => expect(result.current.isQueryDirty).toBe(true));

		// Stage & Run commits the edited query into the draft → must stay dirty.
		rerender({ draftQueries: committed });
		expect(result.current.isQueryDirty).toBe(true);
	});

	it('an untouched panel with a minimal/older stored query is NOT dirty (drift fix)', async () => {
		// An older saved query carries only a few fields; the builder re-emits many more
		// (source, stepInterval, filter, spaceAggregation, …). Comparing raw would read
		// this as always-dirty; the round-tripped baseline normalizes both sides.
		const minimalSaved: DashboardtypesQueryDTO[] = [
			{
				kind: 'time_series',
				spec: {
					plugin: {
						kind: 'signoz/CompositeQuery',
						spec: {
							queries: [
								{
									type: 'builder_query',
									spec: {
										name: 'A',
										signal: 'metrics',
										aggregations: [
											{ metricName: 'system_cpu_time', timeAggregation: 'avg' },
										],
									},
								},
							],
						},
					},
				},
			},
		] as unknown as DashboardtypesQueryDTO[];

		const { result } = renderHook(
			() =>
				usePanelEditorQuerySync({
					draft: makePanel(minimalSaved),
					panelType,
					setSpec: jest.fn(),
					refetch: jest.fn(),
					savedQueries: minimalSaved,
				}),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(result.current.isQueryDirty).toBe(false));
		expect(result.current.isQueryDirty).toBe(false);
	});

	it('a saved panel with no `having` is NOT dirty on mount (builder seeds an empty having)', async () => {
		// Reproduces the reported bug: a panel saved as a bare signoz/BuilderQuery that never
		// carried a `having`. On editor open the builder hydrates from the URL and
		// prepareQueryBuilderData seeds an empty `{ expression: '' }`, so a verbatim envelope
		// compare flags the untouched panel as dirty. Seed via the URL (not resetQuery) so the
		// hydration path that synthesizes the having actually runs.
		const savedNoHaving: DashboardtypesQueryDTO[] = [
			{
				kind: 'time_series',
				spec: {
					name: 'A',
					plugin: {
						kind: 'signoz/BuilderQuery',
						spec: {
							name: 'A',
							signal: 'metrics',
							source: '',
							aggregations: [
								{
									metricName: 'signoz_latency.bucket',
									temporality: 'delta',
									timeAggregation: '',
									spaceAggregation: 'p99',
								},
							],
							disabled: false,
							filter: { expression: 'service.name IN $service_name' },
							groupBy: [
								{
									name: 'service.name',
									signal: '',
									fieldContext: 'resource',
									fieldDataType: '',
								},
							],
							order: [
								{
									key: {
										name: '__result',
										signal: '',
										fieldContext: '',
										fieldDataType: '',
									},
									direction: 'desc',
								},
							],
							limit: 100,
							legend: '',
						},
					},
				},
			},
		] as unknown as DashboardtypesQueryDTO[];

		// The editor puts the (having-less) seed query into the URL; the provider then hydrates
		// from it, which is where the empty having is added.
		const seededInUrl = fromPerses(savedNoHaving, panelType);

		const { result } = renderHook(
			() =>
				usePanelEditorQuerySync({
					draft: makePanel(savedNoHaving),
					panelType,
					setSpec: jest.fn(),
					refetch: jest.fn(),
					savedQueries: savedNoHaving,
				}),
			{ wrapper: makeUrlWrapper(seededInUrl) },
		);

		await waitFor(() => expect(result.current.isQueryDirty).toBe(false));
		expect(result.current.isQueryDirty).toBe(false);
	});

	it('retains an in-editor query edit carried in the URL across a refresh (and reads dirty)', async () => {
		// Simulate a refresh mid-edit: the saved panel is unchanged, but the URL still
		// carries the last-run (edited) query. The builder must hydrate from the URL —
		// not discard it — so the edit survives, and it must read dirty against saved.
		const saved = makeSavedQueries();
		const editedInUrl: Query = {
			...initialQueriesMap[DataSource.METRICS],
			id: 'edited-in-url',
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [
					{
						...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
						legend: 'cpu-edited-in-url',
					},
				],
			},
		};
		const setSpec = jest.fn();

		const { result } = renderHook(
			() =>
				usePanelEditorQuerySync({
					// The draft/preview open on the saved query…
					draft: makePanel(saved),
					panelType,
					setSpec,
					refetch: jest.fn(),
					savedQueries: saved,
				}),
			{ wrapper: makeUrlWrapper(editedInUrl) },
		);

		// The URL edit is retained → dirty, and it's synced into the draft so the
		// preview follows (setSpec called with the edited query).
		await waitFor(() => expect(result.current.isQueryDirty).toBe(true));
		expect(setSpec).toHaveBeenCalled();
	});

	it('is query-dirty when the draft carries an edit the saved panel does not (View handoff)', async () => {
		const saved = makeSavedQueries();
		const editedBase: Query = {
			...initialQueriesMap[DataSource.METRICS],
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [
					{
						...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
						legend: 'cpu-edited',
					},
				],
			},
		};
		const editedQueries = toPerses(editedBase, panelType);

		const { result } = renderHook(
			() =>
				usePanelEditorQuerySync({
					// The builder seeds from the draft (the handed-off edit)…
					draft: makePanel(editedQueries),
					panelType,
					setSpec: jest.fn(),
					refetch: jest.fn(),
					// …but the baseline is the persisted panel.
					savedQueries: saved,
				}),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(result.current.isQueryDirty).toBe(true));
	});
});
