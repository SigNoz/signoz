import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import uPlot from 'uplot';

import { syncCursorRegistry } from '../syncCursorRegistry';
import { createSyncDisplayHook } from '../syncDisplayHook';
import {
	SyncTooltipFilterMode,
	type TooltipControllerState,
	type TooltipSyncMetadata,
} from '../types';

jest.mock('../syncCursorRegistry', () => ({
	syncCursorRegistry: {
		setMetadata: jest.fn(),
		getMetadata: jest.fn(),
		setActiveSeriesMetric: jest.fn(),
		getActiveSeriesMetric: jest.fn(),
	},
}));

const mockRegistry = syncCursorRegistry as {
	setMetadata: jest.Mock;
	getMetadata: jest.Mock;
	setActiveSeriesMetric: jest.Mock;
	getActiveSeriesMetric: jest.Mock;
};

const SYNC_KEY = 'test-sync-key';

// Builds a single-query groupByPerQuery from a list of dimension keys.
const makeGroupByPerQuery = (
	...keys: string[]
): Record<string, BaseAutocompleteData[]> => ({
	A: keys.map((key) => ({ key, type: 'tag' as const })),
});

function makeUPlotRoot(includeCrosshair = true): HTMLElement {
	const root = document.createElement('div');
	if (includeCrosshair) {
		const el = document.createElement('div');
		el.className = 'u-cursor-y';
		root.append(el);
	}
	return root;
}

type FakeSeries = { metric?: Record<string, string>; show?: boolean };

function makeFakeUPlot(opts: {
	cursorEvent?: MouseEvent | null;
	cursorLeft?: number;
	series?: FakeSeries[];
	includeCrosshair?: boolean;
}): uPlot {
	return {
		root: makeUPlotRoot(opts.includeCrosshair ?? true),
		cursor: {
			event: opts.cursorEvent !== undefined ? opts.cursorEvent : null,
			left: opts.cursorLeft ?? 50,
		},
		series: opts.series ?? [
			{},
			{ metric: { host: 'server1' } },
			{ metric: { host: 'server2' } },
		],
		setSeries: jest.fn(),
	} as unknown as uPlot;
}

function makeController(
	focusedSeriesIndex: number | null = null,
): TooltipControllerState {
	return {
		focusedSeriesIndex,
		syncedSeriesIndexes: null,
	} as TooltipControllerState;
}

// Convenience cast used throughout assertions.
function mockSetSeries(u: uPlot): jest.Mock {
	return (u as unknown as { setSeries: jest.Mock }).setSeries;
}

function getCrosshair(u: uPlot): HTMLElement {
	const el = u.root.querySelector<HTMLElement>('.u-cursor-y');
	if (!el) {
		throw new Error('crosshair element missing');
	}
	return el;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('createSyncDisplayHook', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// ── guard ────────────────────────────────────────────────────────────────

	describe('no crosshair element', () => {
		it('returns early without calling registry when .u-cursor-y absent', () => {
			const hook = createSyncDisplayHook(SYNC_KEY, undefined, makeController());
			const u = makeFakeUPlot({ includeCrosshair: false });
			hook(u);
			expect(mockRegistry.setMetadata).not.toHaveBeenCalled();
			expect(mockRegistry.getMetadata).not.toHaveBeenCalled();
			expect(mockSetSeries(u)).not.toHaveBeenCalled();
		});
	});

	// ── source panel ─────────────────────────────────────────────────────────

	describe('source behavior (cursor.event != null)', () => {
		it('writes syncMetadata to registry', () => {
			const syncMetadata: TooltipSyncMetadata = { yAxisUnit: 'ms' };
			const hook = createSyncDisplayHook(SYNC_KEY, syncMetadata, makeController());
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove') });
			hook(u);
			expect(mockRegistry.setMetadata).toHaveBeenCalledWith(
				SYNC_KEY,
				syncMetadata,
			);
		});

		it('writes focused series metric when focusedSeriesIndex is set', () => {
			const series: FakeSeries[] = [
				{},
				{ metric: { host: 'server1' } },
				{ metric: { host: 'server2' } },
			];
			const hook = createSyncDisplayHook(SYNC_KEY, undefined, makeController(1));
			const u = makeFakeUPlot({
				cursorEvent: new MouseEvent('mousemove'),
				series,
			});
			hook(u);
			expect(mockRegistry.setActiveSeriesMetric).toHaveBeenCalledWith(SYNC_KEY, {
				host: 'server1',
			});
		});

		it('writes null metric when focusedSeriesIndex is null', () => {
			const hook = createSyncDisplayHook(
				SYNC_KEY,
				undefined,
				makeController(null),
			);
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove') });
			hook(u);
			expect(mockRegistry.setActiveSeriesMetric).toHaveBeenCalledWith(
				SYNC_KEY,
				null,
			);
		});

		it('clears controller.syncedSeriesIndexes', () => {
			const controller = makeController();
			controller.syncedSeriesIndexes = [1, 2];
			const hook = createSyncDisplayHook(SYNC_KEY, undefined, controller);
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove') });
			hook(u);
			expect(controller.syncedSeriesIndexes).toBeNull();
		});

		it('shows crosshair and does not read from registry', () => {
			const hook = createSyncDisplayHook(SYNC_KEY, undefined, makeController());
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove') });
			hook(u);
			expect(getCrosshair(u).style.display).toBe('');
			expect(mockRegistry.getMetadata).not.toHaveBeenCalled();
		});
	});

	// ── receiver panel ───────────────────────────────────────────────────────

	describe('receiver behavior (cursor.event is null)', () => {
		describe('crosshair visibility', () => {
			it('shows crosshair when yAxisUnit matches source', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms' });
				mockRegistry.getActiveSeriesMetric.mockReturnValue(null);
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms' },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(getCrosshair(u).style.display).toBe('');
			});

			it('hides crosshair when yAxisUnit differs from source', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'bytes' });
				mockRegistry.getActiveSeriesMetric.mockReturnValue(null);
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms' },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(getCrosshair(u).style.display).toBe('none');
			});
		});

		// ── exact groupBy match ───────────────────────────────────────────────

		describe('exact groupBy match', () => {
			const groupByPerQuery = makeGroupByPerQuery('host');
			const series: FakeSeries[] = [
				{},
				{ metric: { host: 'server1' } },
				{ metric: { host: 'server2' } },
			];

			it('focuses the matching series and records it on the controller', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server2' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
				expect(controller.syncedSeriesIndexes).toStrictEqual([2]);
			});

			it('unfocuses all and emits empty matches (Filtered) when active metric is null', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue(null);
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});

			it('unfocuses all when metric matches no series', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'unknown-server',
				});
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});

			it('clears syncedSeriesIndexes when cursor is off-plot (left < 0)', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: -1, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
				expect(controller.syncedSeriesIndexes).toBeNull();
				expect(mockRegistry.getActiveSeriesMetric).not.toHaveBeenCalled();
			});

			it('never focuses series at index 0 (x-axis)', () => {
				const sameMetric = { host: 'server1' };
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue(sameMetric);
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({
					cursorEvent: null,
					cursorLeft: 50,
					// Index 0 has the same metric — it must always be skipped.
					series: [{ metric: sameMetric }, { metric: { host: 'other' } }],
				});
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});

			it('skips hidden series (show === false)', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery },
					controller,
				);
				const u = makeFakeUPlot({
					cursorEvent: null,
					cursorLeft: 50,
					series: [
						{},
						{ metric: { host: 'server1' }, show: false },
						{ metric: { host: 'server1' } },
					],
				});
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
				expect(controller.syncedSeriesIndexes).toStrictEqual([2]);
			});
		});

		// ── partial groupBy overlap ───────────────────────────────────────────

		describe('partial groupBy overlap', () => {
			it('subset — records every receiver series matching on the common key', () => {
				// Source groupBy=[host], receiver groupBy=[host, service].
				// Hook focuses the first match; the rest are surfaced via controller.syncedSeriesIndexes.
				const sourceGroupBy = makeGroupByPerQuery('host');
				const receiverGroupBy = makeGroupByPerQuery('host', 'service');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1', service: 'api' } },
					{ metric: { host: 'server1', service: 'frontend' } },
					{ metric: { host: 'server2', service: 'api' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: receiverGroupBy },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(controller.syncedSeriesIndexes).toStrictEqual([1, 2]);
			});

			it('superset — records the one receiver series matching on the common key', () => {
				// Source groupBy=[host, service], receiver groupBy=[host].
				const sourceGroupBy = makeGroupByPerQuery('host', 'service');
				const receiverGroupBy = makeGroupByPerQuery('host');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1' } },
					{ metric: { host: 'server2' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'server1',
					service: 'api',
				});
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: receiverGroupBy },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(controller.syncedSeriesIndexes).toStrictEqual([1]);
			});

			it('partial — matches on the intersecting key only', () => {
				// Source groupBy=[host, service], receiver groupBy=[service, region].
				// Common key is [service]. Both receiver series with service=api match.
				const sourceGroupBy = makeGroupByPerQuery('host', 'service');
				const receiverGroupBy = makeGroupByPerQuery('service', 'region');
				const series: FakeSeries[] = [
					{},
					{ metric: { service: 'api', region: 'us-east' } },
					{ metric: { service: 'api', region: 'eu-west' } },
					{ metric: { service: 'frontend', region: 'us-east' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'server1',
					service: 'api',
				});
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: receiverGroupBy },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(controller.syncedSeriesIndexes).toStrictEqual([1, 2]);
			});
		});

		// ── union across queries in groupByPerQuery ───────────────────────────

		describe('union across queries', () => {
			it("treats the panel's effective groupBy as the union across its queries", () => {
				// Source has query A=[host]; receiver has A=[host], B=[service].
				// The shared key is `host` — receiver matches on that.
				const sourceGroupBy: Record<string, BaseAutocompleteData[]> = {
					A: [{ key: 'host', type: 'tag' }],
				};
				const receiverGroupBy: Record<string, BaseAutocompleteData[]> = {
					A: [{ key: 'host', type: 'tag' }],
					B: [{ key: 'service', type: 'tag' }],
				};
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: receiverGroupBy },
					controller,
				);
				const u = makeFakeUPlot({
					cursorEvent: null,
					cursorLeft: 50,
					series: [
						{},
						{ metric: { host: 'server1' } },
						{ metric: { host: 'server2' } },
					],
				});
				hook(u);
				expect(controller.syncedSeriesIndexes).toStrictEqual([1]);
			});
		});

		// ── no overlap (Filtered mode default) ────────────────────────────────

		describe('no overlap → Filtered mode emits []', () => {
			it('emits [] when groupBy keys are completely different', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: makeGroupByPerQuery('host'),
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: makeGroupByPerQuery('service') },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});

			it('emits [] when receiver groupBy is empty', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: makeGroupByPerQuery('host'),
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: {} },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});

			it('emits [] when source groupBy is absent', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupByPerQuery: makeGroupByPerQuery('host') },
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(controller.syncedSeriesIndexes).toStrictEqual([]);
			});
		});

		// ── filterMode: All ──────────────────────────────────────────────────

		describe('filterMode All', () => {
			it('emits null (no filter) when there is no overlap in groupBy', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery: makeGroupByPerQuery('host'),
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{
						yAxisUnit: 'ms',
						groupByPerQuery: makeGroupByPerQuery('service'),
						filterMode: SyncTooltipFilterMode.All,
					},
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(controller.syncedSeriesIndexes).toBeNull();
			});

			it('emits null when metric matches no series', () => {
				const groupByPerQuery = makeGroupByPerQuery('host');
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupByPerQuery,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'unknown' });
				const controller = makeController();
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{
						yAxisUnit: 'ms',
						groupByPerQuery,
						filterMode: SyncTooltipFilterMode.All,
					},
					controller,
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50 });
				hook(u);
				expect(controller.syncedSeriesIndexes).toBeNull();
			});
		});

		// ── caching ───────────────────────────────────────────────────────────

		describe('caching optimizations', () => {
			it('reuses the crosshair element across multiple invocations', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms' });
				mockRegistry.getActiveSeriesMetric.mockReturnValue(null);
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms' },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				const spy = jest.spyOn(u.root, 'querySelector');
				hook(u);
				hook(u);
				hook(u);
				// querySelector should only be called once regardless of invocation count.
				expect(spy).toHaveBeenCalledTimes(1);
			});

			it('recomputes common keys when source groupByPerQuery reference changes', () => {
				const hostGroupBy = makeGroupByPerQuery('host');
				const serviceGroupBy = makeGroupByPerQuery('service');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1', service: 'api' } },
					{ metric: { host: 'server2', service: 'frontend' } },
				];
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ groupByPerQuery: makeGroupByPerQuery('host', 'service') },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });

				// First call: source groups by host → matches series 1.
				mockRegistry.getMetadata.mockReturnValue({
					groupByPerQuery: hostGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });

				jest.clearAllMocks();

				// Second call: source now groups by service → matches series 2.
				mockRegistry.getMetadata.mockReturnValue({
					groupByPerQuery: serviceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					service: 'frontend',
				});
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
			});
		});
	});
});
