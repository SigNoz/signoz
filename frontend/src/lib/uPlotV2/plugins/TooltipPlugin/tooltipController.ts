import type React from 'react';
import uPlot from 'uplot';

import type { TooltipRenderArgs } from '../../components/types';
import {
	DashboardCursorSync,
	TooltipLayoutInfo,
	TooltipViewState,
} from './types';
import {
	buildTransform,
	calculateTooltipPosition,
	isPlotInViewport,
} from './utils';

const WINDOW_OFFSET = 16;

/**
 * Mutable, non-React state that drives tooltip behaviour:
 * - whether the tooltip is active / pinned
 * - where it should be positioned
 * - which series / data indexes are active
 *
 * This state lives outside of React so that uPlot hooks and DOM
 * event handlers can update it freely without causing re‑renders
 * on every tiny interaction. React is only updated when a render
 * is explicitly scheduled from the plugin.
 */
export interface TooltipControllerState {
	plot: uPlot | null;
	hoverActive: boolean;
	anySeriesActive: boolean;
	pinned: boolean;
	style: TooltipViewState['style'];
	horizontalOffset: number;
	verticalOffset: number;
	seriesIndexes: Array<number | null>;
	focusedSeriesIndex: number | null;
	cursorDrivenBySync: boolean;
	plotWithinViewport: boolean;
	windowWidth: number;
	windowHeight: number;
	renderScheduled: boolean;
	pendingPinnedUpdate: boolean;
}

export function createInitialControllerState(): TooltipControllerState {
	return {
		plot: null,
		hoverActive: false,
		anySeriesActive: false,
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
		renderScheduled: false,
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

/**
 * Context passed to uPlot hook handlers.
 *
 * It gives the handlers access to:
 * - the shared controller state
 * - layout / container refs
 * - the React `updateState` function
 * - render & dismiss helpers from the plugin
 */
export interface TooltipControllerContext {
	controller: TooltipControllerState;
	layoutRef: React.MutableRefObject<TooltipLayoutInfo | undefined>;
	containerRef: React.RefObject<HTMLDivElement | null>;
	rafId: React.MutableRefObject<number | null>;
	updateState: (updates: Partial<TooltipViewState>) => void;
	renderRef: React.MutableRefObject<
		(args: TooltipRenderArgs) => React.ReactNode
	>;
	syncMode: DashboardCursorSync;
	syncKey: string;
	isPinningTooltipEnabled: boolean;
	createTooltipContents: () => React.ReactNode;
	scheduleRender: (updatePinned?: boolean) => void;
	dismissTooltip: () => void;
}

export function shouldShowTooltipForSync(
	controller: TooltipControllerState,
	syncTooltipWithDashboard: boolean,
): boolean {
	return (
		controller.plotWithinViewport &&
		controller.anySeriesActive &&
		syncTooltipWithDashboard
	);
}

export function shouldShowTooltipForInteraction(
	controller: TooltipControllerState,
): boolean {
	return controller.focusedSeriesIndex != null || controller.anySeriesActive;
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
		const offsets = calculateTooltipPosition(
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

		controller.seriesIndexes = controller.plot.cursor.idxs.slice();
		controller.anySeriesActive = controller.seriesIndexes.some(
			(v, i) => i > 0 && v != null,
		);
		controller.cursorDrivenBySync = u.cursor.event == null;

		// Track transitions into / out of hover so we can avoid
		// unnecessary renders when nothing visible has changed.
		const previousHover = controller.hoverActive;
		updateHoverState(controller, syncTooltipWithDashboard);

		if (controller.hoverActive || controller.hoverActive !== previousHover) {
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
