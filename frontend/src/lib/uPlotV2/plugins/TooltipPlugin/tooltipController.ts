import { isEqual } from 'lodash-es';
import uPlot from 'uplot';

import { TooltipControllerContext, TooltipControllerState } from './types';
import {
	buildTransform,
	calculateTooltipOffset,
	isPlotInViewport,
} from './utils';

const WINDOW_OFFSET = 16;

export function createInitialControllerState(): TooltipControllerState {
	return {
		plot: null,
		hoverActive: false,
		isAnySeriesActive: false,
		pinned: false,
		style: { transform: '', pointerEvents: 'none' },
		horizontalOffset: 0,
		verticalOffset: 0,
		seriesIndexes: [],
		focusedSeriesIndex: null,
		cursorDrivenBySync: false,
		plotWithinViewport: false,
		windowWidth: window.innerWidth - WINDOW_OFFSET,
		windowHeight: window.innerHeight - WINDOW_OFFSET,
		pendingPinnedUpdate: false,
	};
}

/**
 * Keep track of the current window size and clear hover state
 * when the user resizes while hovering (to avoid an orphan tooltip).
 */
export function updateWindowSize(controller: TooltipControllerState): void {
	if (controller.hoverActive && !controller.pinned) {
		controller.hoverActive = false;
	}
	controller.windowWidth = window.innerWidth - WINDOW_OFFSET;
	controller.windowHeight = window.innerHeight - WINDOW_OFFSET;
}

/**
 * Mark whether the plot is currently inside the viewport.
 * This is used to decide if a synced tooltip should be shown at all.
 */
export function updatePlotVisibility(controller: TooltipControllerState): void {
	if (!controller.plot) {
		controller.plotWithinViewport = false;
		return;
	}
	controller.plotWithinViewport = isPlotInViewport(
		controller.plot.rect,
		controller.windowWidth,
		controller.windowHeight,
	);
}

/**
 * Helper to detect whether a scroll event actually happened inside
 * the plot container. Used so we only dismiss the tooltip when the
 * user scrolls the chart, not the whole page.
 */
export function isScrollEventInPlot(
	event: Event,
	controller: TooltipControllerState,
): boolean {
	return (
		event.target instanceof Node &&
		controller.plot !== null &&
		event.target.contains(controller.plot.root)
	);
}

export function shouldShowTooltipForSync(
	controller: TooltipControllerState,
	syncTooltipWithDashboard: boolean,
): boolean {
	return (
		controller.plotWithinViewport &&
		controller.isAnySeriesActive &&
		syncTooltipWithDashboard
	);
}

export function shouldShowTooltipForInteraction(
	controller: TooltipControllerState,
): boolean {
	return controller.focusedSeriesIndex != null;
}

export function updateHoverState(
	controller: TooltipControllerState,
	syncTooltipWithDashboard: boolean,
): void {
	// When the cursor is driven by dashboard‑level sync, we only show
	// the tooltip if the plot is in viewport and at least one series
	// is active. Otherwise we fall back to local interaction logic.
	controller.hoverActive = controller.cursorDrivenBySync
		? shouldShowTooltipForSync(controller, syncTooltipWithDashboard)
		: shouldShowTooltipForInteraction(controller);
}

export function createSetCursorHandler(
	ctx: TooltipControllerContext,
): (u: uPlot) => void {
	return (u: uPlot): void => {
		const { controller, layoutRef, containerRef } = ctx;
		controller.cursorDrivenBySync = u.cursor.event == null;

		if (!controller.hoverActive) {
			return;
		}

		const { left = -10, top = -10 } = u.cursor;
		if (left < 0 && top < 0) {
			return;
		}

		const clientX = u.rect.left + left;
		const clientY = u.rect.top + top;
		const layout = layoutRef.current;
		if (!layout) {
			return;
		}

		const { width: layoutWidth, height: layoutHeight } = layout;
		const offsets = calculateTooltipOffset(
			clientX,
			clientY,
			layoutWidth,
			layoutHeight,
			controller.horizontalOffset,
			controller.verticalOffset,
			controller.windowWidth,
			controller.windowHeight,
		);

		controller.horizontalOffset = offsets.horizontalOffset;
		controller.verticalOffset = offsets.verticalOffset;

		const transform = buildTransform(
			clientX,
			clientY,
			controller.horizontalOffset,
			controller.verticalOffset,
		);

		// If the DOM node is mounted we move it directly to avoid
		// going through React; otherwise we cache the transform in
		// controller.style and ask the plugin to re‑render.
		if (containerRef.current) {
			containerRef.current.style.transform = transform;
		} else {
			controller.style = { ...controller.style, transform };
			ctx.scheduleRender();
		}
	};
}

export function createSetLegendHandler(
	ctx: TooltipControllerContext,
	syncTooltipWithDashboard: boolean,
): (u: uPlot) => void {
	return (u: uPlot): void => {
		const { controller } = ctx;
		if (!controller.plot?.cursor?.idxs) {
			return;
		}

		const newSeriesIndexes = controller.plot.cursor.idxs.slice();
		const isAnySeriesActive = newSeriesIndexes.some((v, i) => i > 0 && v != null);

		const previousCursorDrivenBySync = controller.cursorDrivenBySync;

		// Skip scheduling if legend data is unchanged
		const seriesIndexesChanged = !isEqual(
			controller.seriesIndexes,
			newSeriesIndexes,
		);

		controller.seriesIndexes = newSeriesIndexes;
		controller.isAnySeriesActive = isAnySeriesActive;
		controller.cursorDrivenBySync = u.cursor.event == null;

		const previousHover = controller.hoverActive;
		updateHoverState(controller, syncTooltipWithDashboard);
		const hoverStateChanged = controller.hoverActive !== previousHover;

		const cursorDrivenBySyncChanged =
			controller.cursorDrivenBySync !== previousCursorDrivenBySync;

		// Only schedule when legend data, hover state, or sync‑driven state has changed
		if (seriesIndexesChanged || hoverStateChanged || cursorDrivenBySyncChanged) {
			ctx.scheduleRender();
		}
	};
}

export function createSetSeriesHandler(
	ctx: TooltipControllerContext,
	syncTooltipWithDashboard: boolean,
): (u: uPlot, seriesIdx: number | null, opts: uPlot.Series) => void {
	return (u: uPlot, seriesIdx: number | null, opts: uPlot.Series): void => {
		const { controller } = ctx;
		if (!('focus' in opts)) {
			return;
		}

		// Remember which series is focused so we can drive hover
		// logic even when the tooltip is being synced externally.
		controller.focusedSeriesIndex = seriesIdx ?? null;
		controller.cursorDrivenBySync = u.cursor.event == null;
		updateHoverState(controller, syncTooltipWithDashboard);
		ctx.scheduleRender();
	};
}
