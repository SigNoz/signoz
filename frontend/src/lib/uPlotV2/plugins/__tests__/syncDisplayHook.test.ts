import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type uPlot from 'uplot';

import type { ExtendedSeries } from '../../config/types';
import { syncCursorRegistry } from '../TooltipPlugin/syncCursorRegistry';
import { createSyncDisplayHook } from '../TooltipPlugin/syncDisplayHook';
import type {
	TooltipControllerState,
	TooltipSyncMetadata,
} from '../TooltipPlugin/types';

const SYNC_KEY = 'test-sync';

function makeController(): TooltipControllerState {
	return {
		plot: null,
		hoverActive: false,
		isAnySeriesActive: false,
		pinned: false,
		clickData: null,
		style: {},
		horizontalOffset: 0,
		verticalOffset: 0,
		seriesIndexes: [],
		focusedSeriesIndex: null,
		syncedSeriesIndexes: null,
		cursorDrivenBySync: false,
		plotWithinViewport: true,
		windowWidth: 1024,
		windowHeight: 768,
		pendingPinnedUpdate: false,
	};
}

function makeFakePlot(
	series: ExtendedSeries[],
	cursorEvent: Record<string, unknown> | null = null,
): uPlot {
	const root = document.createElement('div');
	const yCrosshair = document.createElement('div');
	yCrosshair.className = 'u-cursor-y';
	root.appendChild(yCrosshair);

	return {
		root,
		series,
		cursor: { event: cursorEvent, left: 50 },
		setSeries: jest.fn(),
	} as unknown as uPlot;
}

const SERVICE_NAME_KEY: BaseAutocompleteData = {
	key: 'service.name',
	type: 'tag',
};

const groupByService: TooltipSyncMetadata = {
	groupByPerQuery: { queryName: [SERVICE_NAME_KEY] },
};

function seedSourcePanel(activeMetric: Record<string, string>): void {
	syncCursorRegistry.setMetadata(SYNC_KEY, groupByService);
	syncCursorRegistry.setActiveSeriesMetric(SYNC_KEY, activeMetric);
}

function makeReceiverSeries(
	entries: { name: string; show?: boolean }[],
): ExtendedSeries[] {
	return [
		{} as ExtendedSeries,
		...entries.map(
			(e) =>
				({
					show: e.show ?? true,
					metric: { 'service.name': e.name },
				}) as unknown as ExtendedSeries,
		),
	];
}

describe('createSyncDisplayHook (receiver-side filtering)', () => {
	beforeEach(() => {
		syncCursorRegistry.setMetadata(SYNC_KEY, undefined);
		syncCursorRegistry.setActiveSeriesMetric(SYNC_KEY, null);
	});

	it('returns indexes of visible matching series only', () => {
		seedSourcePanel({ 'service.name': 'flagd' });

		const series = makeReceiverSeries([
			{ name: 'flagd', show: true },
			{ name: 'frontend', show: true },
			{ name: 'flagd', show: true },
		]);
		const plot = makeFakePlot(series, null);
		const controller = makeController();

		createSyncDisplayHook(SYNC_KEY, groupByService, controller)(plot);

		expect(controller.syncedSeriesIndexes).toStrictEqual([1, 3]);
	});

	it('treats all matching series being hidden as no match → empty array', () => {
		seedSourcePanel({ 'service.name': 'frontendproxy' });

		const series = makeReceiverSeries([
			{ name: 'flagd', show: true },
			{ name: 'frontendproxy', show: false },
		]);
		const plot = makeFakePlot(series, null);
		const controller = makeController();

		createSyncDisplayHook(SYNC_KEY, groupByService, controller)(plot);

		expect(controller.syncedSeriesIndexes).toStrictEqual([]);
		expect(plot.setSeries).toHaveBeenCalledWith(null, { focus: false });
	});

	it('excludes hidden series and keeps the visible matches', () => {
		seedSourcePanel({ 'service.name': 'flagd' });

		const series = makeReceiverSeries([
			{ name: 'flagd', show: false },
			{ name: 'frontend', show: true },
			{ name: 'flagd', show: true },
		]);
		const plot = makeFakePlot(series, null);
		const controller = makeController();

		createSyncDisplayHook(SYNC_KEY, groupByService, controller)(plot);

		expect(controller.syncedSeriesIndexes).toStrictEqual([3]);
		// Focuses the first visible match, not the hidden one at index 1.
		expect(plot.setSeries).toHaveBeenCalledWith(3, { focus: true });
	});

	it('returns null (no filtering) when the hook runs on the source panel', () => {
		const series = makeReceiverSeries([{ name: 'flagd', show: true }]);
		// cursor.event != null marks this invocation as the source panel.
		const plot = makeFakePlot(series, { type: 'mousemove' });
		const controller = makeController();
		controller.focusedSeriesIndex = 1;
		(series[1] as ExtendedSeries).metric = { 'service.name': 'flagd' };

		createSyncDisplayHook(SYNC_KEY, groupByService, controller)(plot);

		expect(controller.syncedSeriesIndexes).toBeNull();
		expect(syncCursorRegistry.getActiveSeriesMetric(SYNC_KEY)).toStrictEqual({
			'service.name': 'flagd',
		});
	});
});
