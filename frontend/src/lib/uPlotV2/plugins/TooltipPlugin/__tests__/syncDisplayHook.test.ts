import uPlot from 'uplot';

import { syncCursorRegistry } from '../syncCursorRegistry';
import { createSyncDisplayHook } from '../syncDisplayHook';
import type { TooltipControllerState, TooltipSyncMetadata } from '../types';

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

// Accept multiple keys so multi-dimension groupBy tests don't need ad-hoc objects.
const makeGroupBy = (...keys: string[]): { key: string; type: 'tag' }[] =>
	keys.map((key) => ({ key, type: 'tag' as const }));

function makeUPlotRoot(includeCrosshair = true): HTMLElement {
	const root = document.createElement('div');
	if (includeCrosshair) {
		const el = document.createElement('div');
		el.className = 'u-cursor-y';
		root.append(el);
	}
	return root;
}

type FakeSeries = { metric?: Record<string, string> };

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
		// Execute the callback synchronously so setSeries calls inside are observable.
		batch: jest.fn((fn: () => void) => fn()),
	} as unknown as uPlot;
}

function makeController(
	focusedSeriesIndex: number | null = null,
): TooltipControllerState {
	return { focusedSeriesIndex } as TooltipControllerState;
}

// Convenience cast used throughout assertions.
function mockSetSeries(u: uPlot): jest.Mock {
	return (u as unknown as { setSeries: jest.Mock }).setSeries;
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
			expect(mockRegistry.setMetadata).toHaveBeenCalledWith(SYNC_KEY, syncMetadata);
		});

		it('writes focused series metric when focusedSeriesIndex is set', () => {
			const series: FakeSeries[] = [
				{},
				{ metric: { host: 'server1' } },
				{ metric: { host: 'server2' } },
			];
			const hook = createSyncDisplayHook(
				SYNC_KEY,
				undefined,
				makeController(1),
			);
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove'), series });
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

		it('shows crosshair and does not read from registry', () => {
			const hook = createSyncDisplayHook(SYNC_KEY, undefined, makeController());
			const u = makeFakeUPlot({ cursorEvent: new MouseEvent('mousemove') });
			hook(u);
			const el = u.root.querySelector<HTMLElement>('.u-cursor-y')!;
			expect(el.style.display).toBe('');
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
				expect(
					u.root.querySelector<HTMLElement>('.u-cursor-y')!.style.display,
				).toBe('');
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
				expect(
					u.root.querySelector<HTMLElement>('.u-cursor-y')!.style.display,
				).toBe('none');
			});
		});

		// ── exact groupBy match ───────────────────────────────────────────────

		describe('exact groupBy match', () => {
			const groupBy = makeGroupBy('host');
			const series: FakeSeries[] = [
				{},
				{ metric: { host: 'server1' } },
				{ metric: { host: 'server2' } },
			];

			it('focuses the matching series', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms', groupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server2' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
			});

			it('unfocuses all when active metric is null', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms', groupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue(null);
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
			});

			it('unfocuses all when metric matches no series', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms', groupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'unknown-server',
				});
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
			});

			it('unfocuses all when cursor is off-plot (left < 0)', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms', groupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: -1, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
				expect(mockRegistry.getActiveSeriesMetric).not.toHaveBeenCalled();
			});

			it('never focuses series at index 0 (x-axis)', () => {
				const sameMetric = { host: 'server1' };
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms', groupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue(sameMetric);
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy },
					makeController(),
				);
				const u = makeFakeUPlot({
					cursorEvent: null,
					cursorLeft: 50,
					// Index 0 has the same metric — it must always be skipped.
					series: [{ metric: sameMetric }, { metric: { host: 'other' } }],
				});
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(null, { focus: false });
			});
		});

		// ── partial groupBy overlap ───────────────────────────────────────────

		describe('partial groupBy overlap', () => {
			it('subset — highlights all receiver series matching on the common key', () => {
				// Source groupBy=[host], receiver groupBy=[host, service].
				// All receiver series with host=server1 should be focused.
				const sourceGroupBy = makeGroupBy('host');
				const receiverGroupBy = makeGroupBy('host', 'service');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1', service: 'api' } },
					{ metric: { host: 'server1', service: 'frontend' } },
					{ metric: { host: 'server2', service: 'api' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: receiverGroupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
				expect(mockSetSeries(u)).not.toHaveBeenCalledWith(3, expect.anything());
			});

			it('subset — uses batch for multi-series focus', () => {
				const sourceGroupBy = makeGroupBy('host');
				const receiverGroupBy = makeGroupBy('host', 'service');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1', service: 'api' } },
					{ metric: { host: 'server1', service: 'frontend' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: receiverGroupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(
					(u as unknown as { batch: jest.Mock }).batch,
				).toHaveBeenCalledTimes(1);
			});

			it('superset — highlights the one receiver series matching on the common key', () => {
				// Source groupBy=[host, service], receiver groupBy=[host].
				// Only the receiver series with host=server1 should be focused.
				const sourceGroupBy = makeGroupBy('host', 'service');
				const receiverGroupBy = makeGroupBy('host');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1' } },
					{ metric: { host: 'server2' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'server1',
					service: 'api',
				});
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: receiverGroupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(mockSetSeries(u)).not.toHaveBeenCalledWith(2, expect.anything());
			});

			it('partial — matches on the intersecting key only', () => {
				// Source groupBy=[host, service], receiver groupBy=[service, region].
				// Common key is [service]. Both receiver series with service=api match.
				const sourceGroupBy = makeGroupBy('host', 'service');
				const receiverGroupBy = makeGroupBy('service', 'region');
				const series: FakeSeries[] = [
					{},
					{ metric: { service: 'api', region: 'us-east' } },
					{ metric: { service: 'api', region: 'eu-west' } },
					{ metric: { service: 'frontend', region: 'us-east' } },
				];
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: sourceGroupBy,
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					host: 'server1',
					service: 'api',
				});
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: receiverGroupBy },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
				expect(mockSetSeries(u)).not.toHaveBeenCalledWith(3, expect.anything());
			});
		});

		// ── no highlighting when no common keys ───────────────────────────────

		describe('no series highlighting when groupBy has no overlap', () => {
			it('does not call setSeries when groupBy keys are completely different', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: makeGroupBy('host'),
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: makeGroupBy('service') },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(mockSetSeries(u)).not.toHaveBeenCalled();
			});

			it('does not call setSeries when receiver groupBy is empty', () => {
				mockRegistry.getMetadata.mockReturnValue({
					yAxisUnit: 'ms',
					groupBy: makeGroupBy('host'),
				});
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: [] },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(mockSetSeries(u)).not.toHaveBeenCalled();
			});

			it('does not call setSeries when source groupBy is absent', () => {
				mockRegistry.getMetadata.mockReturnValue({ yAxisUnit: 'ms' });
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ yAxisUnit: 'ms', groupBy: makeGroupBy('host') },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null });
				hook(u);
				expect(mockSetSeries(u)).not.toHaveBeenCalled();
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

			it('recomputes common keys when source groupBy reference changes', () => {
				const hostGroupBy = makeGroupBy('host');
				const serviceGroupBy = makeGroupBy('service');
				const series: FakeSeries[] = [
					{},
					{ metric: { host: 'server1', service: 'api' } },
					{ metric: { host: 'server2', service: 'frontend' } },
				];
				const hook = createSyncDisplayHook(
					SYNC_KEY,
					{ groupBy: makeGroupBy('host', 'service') },
					makeController(),
				);
				const u = makeFakeUPlot({ cursorEvent: null, cursorLeft: 50, series });

				// First call: source groups by host → matches series 1.
				mockRegistry.getMetadata.mockReturnValue({ groupBy: hostGroupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue({ host: 'server1' });
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(1, { focus: true });

				jest.clearAllMocks();

				// Second call: source now groups by service → matches series 2.
				mockRegistry.getMetadata.mockReturnValue({ groupBy: serviceGroupBy });
				mockRegistry.getActiveSeriesMetric.mockReturnValue({
					service: 'frontend',
				});
				hook(u);
				expect(mockSetSeries(u)).toHaveBeenCalledWith(2, { focus: true });
			});
		});
	});
});
