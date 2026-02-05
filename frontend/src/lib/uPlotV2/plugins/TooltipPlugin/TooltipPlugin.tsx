import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';
import uPlot from 'uplot';

import {
	createInitialControllerState,
	createSetCursorHandler,
	createSetLegendHandler,
	createSetSeriesHandler,
	isScrollEventInPlot,
	updatePlotVisibility,
	updateWindowSize,
} from './tooltipController';
import {
	DashboardCursorSync,
	TooltipControllerContext,
	TooltipControllerState,
	TooltipLayoutInfo,
	TooltipPluginProps,
	TooltipViewState,
} from './types';
import { createInitialViewState, createLayoutObserver } from './utils';

import './TooltipPlugin.styles.scss';

const INTERACTIVE_CONTAINER_CLASSNAME = '.tooltip-plugin-container';
// Delay before hiding an unpinned tooltip when the cursor briefly leaves
// the plot – this avoids flicker when moving between nearby points.
const HOVER_DISMISS_DELAY_MS = 100;

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function TooltipPlugin({
	config,
	render,
	maxWidth = 300,
	maxHeight = 400,
	syncMode = DashboardCursorSync.None,
	syncKey = '_tooltip_sync_global_',
	canPinTooltip = false,
}: TooltipPluginProps): JSX.Element | null {
	const containerRef = useRef<HTMLDivElement>(null);
	const portalRoot = useRef<HTMLElement>(document.body);
	const rafId = useRef<number | null>(null);
	const dismissTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
	const layoutRef = useRef<TooltipLayoutInfo>();
	const renderRef = useRef(render);
	renderRef.current = render;

	// React-managed snapshot of what should be rendered. The controller
	// owns the interaction state and calls `updateState` when a visible
	// change should trigger a React re-render.
	const [viewState, setState] = useState<TooltipViewState>(
		createInitialViewState,
	);
	const { plot, isHovering, isPinned, contents, style } = viewState;

	/**
	 * Merge a partial view update into the current React state.
	 * Style is merged shallowly so callers can update transform /
	 * pointerEvents without having to rebuild the whole object.
	 */
	function updateState(updates: Partial<TooltipViewState>): void {
		setState((prev) => ({
			...prev,
			...updates,
			style: { ...prev.style, ...updates.style },
		}));
	}

	useLayoutEffect((): (() => void) => {
		layoutRef.current?.observer.disconnect();
		layoutRef.current = createLayoutObserver(layoutRef);

		// Controller holds the mutable interaction state for this tooltip
		// instance. It is intentionally *not* React state so uPlot hooks
		// and DOM listeners can update it freely without triggering a
		// render on every mouse move.
		const controller: TooltipControllerState = createInitialControllerState();

		const syncTooltipWithDashboard = syncMode === DashboardCursorSync.Tooltip;

		// Enable uPlot's built-in cursor sync when requested so that
		// crosshair / tooltip can follow the dashboard-wide cursor.
		if (syncMode !== DashboardCursorSync.None && config.scales[0]?.props.time) {
			config.setCursor({
				sync: { key: syncKey, scales: ['x', null] },
			});
		}

		// Dismiss the tooltip when the user clicks / presses a key
		// outside the tooltip container while it is pinned.
		const onOutsideInteraction = (event: Event): void => {
			const target = event.target as HTMLElement;
			if (!target.closest(INTERACTIVE_CONTAINER_CLASSNAME)) {
				dismissTooltip();
			}
		};

		// When pinned we want the tooltip to be mouse-interactive
		// (for copying values etc.), otherwise it should ignore
		// pointer events so the chart remains fully clickable.
		function updatePointerEvents(): void {
			controller.style = {
				...controller.style,
				pointerEvents: controller.pinned ? 'all' : 'none',
			};
		}

		// Lock uPlot's internal cursor when the tooltip is pinned so
		// subsequent mouse moves do not move the crosshair.
		function updateCursorLock(): void {
			if (controller.plot) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore uPlot cursor lock is not working as expected
				controller.plot.cursor._lock = controller.pinned;
			}
		}

		// Attach / detach global listeners when pin state changes so
		// we can detect when the user interacts outside the tooltip.
		function toggleOutsideListeners(enable: boolean): void {
			if (enable) {
				document.addEventListener('mousedown', onOutsideInteraction, true);
				document.addEventListener('keydown', onOutsideInteraction, true);
			} else {
				document.removeEventListener('mousedown', onOutsideInteraction, true);
				document.removeEventListener('keydown', onOutsideInteraction, true);
			}
		}

		// Centralised helper that applies all side effects that depend
		// on whether the tooltip is currently pinned.
		function applyPinnedSideEffects(): void {
			updatePointerEvents();
			updateCursorLock();
			toggleOutsideListeners(controller.pinned);
		}

		// Hide the tooltip and reset the uPlot cursor. This is used
		// both when the user unpins and when interaction ends.
		function dismissTooltip(): void {
			const isPinnedBeforeDismiss = controller.pinned;
			controller.pinned = false;
			controller.hoverActive = false;
			if (controller.plot) {
				controller.plot.setCursor({ left: -10, top: -10 });
			}
			scheduleRender(isPinnedBeforeDismiss);
		}

		// Build the React node to be rendered inside the tooltip by
		// delegating to the caller-provided `render` function.
		function createTooltipContents(): React.ReactNode {
			if (!controller.hoverActive || !controller.plot) {
				return null;
			}
			return renderRef.current({
				uPlotInstance: controller.plot,
				dataIndexes: controller.seriesIndexes,
				seriesIndex: controller.focusedSeriesIndex,
				isPinned: controller.pinned,
				dismiss: dismissTooltip,
				viaSync: controller.cursorDrivenBySync,
			});
		}

		// Push the latest controller state into React so the tooltip's
		// DOM representation catches up with the interaction state.
		function performRender(): void {
			rafId.current = null;
			dismissTimeoutId.current = null;

			if (controller.pendingPinnedUpdate) {
				applyPinnedSideEffects();
				controller.pendingPinnedUpdate = false;
			}

			updateState({
				style: controller.style,
				isPinned: controller.pinned,
				isHovering: controller.hoverActive,
				contents: createTooltipContents(),
				dismiss: dismissTooltip,
			});
		}

		// Cancel any pending render to prevent race conditions
		function cancelPendingRender(): void {
			if (rafId.current != null) {
				cancelAnimationFrame(rafId.current);
				rafId.current = null;
			}
			if (dismissTimeoutId.current != null) {
				clearTimeout(dismissTimeoutId.current);
				dismissTimeoutId.current = null;
			}
		}

		// Throttle React re-renders:
		// - use rAF while hovering for smooth updates
		// - use a small timeout when hiding to avoid flicker when
		//   briefly leaving and re-entering the plot.
		//
		// Re-entering hover while a dismiss timeout is pending should
		// cancel that timeout so it cannot fire with stale state.
		function scheduleRender(updatePinned = false): void {
			// Always cancel any existing pending callback first so that
			// a newly scheduled render reflects the latest controller
			// state (e.g. when quickly re-entering after a brief leave).
			cancelPendingRender();

			if (controller.hoverActive) {
				rafId.current = requestAnimationFrame(performRender);
			} else {
				dismissTimeoutId.current = setTimeout(
					performRender,
					HOVER_DISMISS_DELAY_MS,
				);
			}

			if (updatePinned) {
				controller.pendingPinnedUpdate = true;
			}
		}

		// Keep controller's windowWidth / windowHeight in sync so that
		// tooltip positioning can respect the current viewport size.
		const handleWindowResize = (): void => {
			updateWindowSize(controller);
		};

		// When the user scrolls, recompute plot visibility and hide
		// the tooltip if the scroll originated from inside the plot.
		const handleScroll = (event: Event): void => {
			updatePlotVisibility(controller);
			if (controller.hoverActive && isScrollEventInPlot(event, controller)) {
				dismissTooltip();
			}
		};

		// When pinning is enabled, a click on the plot overlay while
		// hovering converts the transient tooltip into a pinned one.
		const handleUPlotOverClick = (u: uPlot, event: MouseEvent): void => {
			if (
				event.target === u.over &&
				controller.hoverActive &&
				!controller.pinned &&
				controller.focusedSeriesIndex != null
			) {
				setTimeout(() => {
					controller.pinned = true;
					scheduleRender(true);
				}, 0);
			}
		};

		let overClickHandler: ((event: MouseEvent) => void) | null = null;

		// Called once per uPlot instance; used to store the instance
		// on the controller and optionally attach the pinning handler.
		const handleInit = (u: uPlot): void => {
			controller.plot = u;
			updateState({ plot: u });
			if (canPinTooltip) {
				overClickHandler = (event: MouseEvent): void =>
					handleUPlotOverClick(u, event);
				u.over.addEventListener('click', overClickHandler);
			}
		};

		// If the underlying data changes we drop any pinned tooltip,
		// since the contents may no longer match the new series data.
		const handleSetData = (): void => {
			if (controller.pinned) {
				dismissTooltip();
			}
		};

		// Shared context object passed down into all uPlot hook
		// handlers so they can interact with the controller and
		// schedule React updates when needed.
		const ctx: TooltipControllerContext = {
			controller,
			layoutRef,
			containerRef,
			rafId,
			updateState,
			renderRef,
			syncMode,
			syncKey,
			canPinTooltip,
			createTooltipContents,
			scheduleRender,
			dismissTooltip,
		};

		const handleSetSeries = createSetSeriesHandler(ctx, syncTooltipWithDashboard);
		const handleSetLegend = createSetLegendHandler(ctx, syncTooltipWithDashboard);
		const handleSetCursor = createSetCursorHandler(ctx);

		handleWindowResize();

		const removeReadyHook = config.addHook('ready', (): void =>
			updatePlotVisibility(controller),
		);
		const removeInitHook = config.addHook('init', handleInit);
		const removeSetDataHook = config.addHook('setData', handleSetData);
		const removeSetSeriesHook = config.addHook('setSeries', handleSetSeries);
		const removeSetLegendHook = config.addHook('setLegend', handleSetLegend);
		const removeSetCursorHook = config.addHook('setCursor', handleSetCursor);

		window.addEventListener('resize', handleWindowResize);
		window.addEventListener('scroll', handleScroll, true);

		return (): void => {
			layoutRef.current?.observer.disconnect();
			window.removeEventListener('resize', handleWindowResize);
			window.removeEventListener('scroll', handleScroll, true);
			document.removeEventListener('mousedown', onOutsideInteraction, true);
			document.removeEventListener('keydown', onOutsideInteraction, true);
			cancelPendingRender();
			removeReadyHook();
			removeInitHook();
			removeSetDataHook();
			removeSetSeriesHook();
			removeSetLegendHook();
			removeSetCursorHook();
			if (controller.plot && overClickHandler) {
				controller.plot.over.removeEventListener('click', overClickHandler);
				overClickHandler = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config]);

	useLayoutEffect((): void => {
		if (!plot || !layoutRef.current) {
			return;
		}
		const layout = layoutRef.current;
		if (containerRef.current) {
			layout.observer.disconnect();
			layout.observer.observe(containerRef.current);
			const { width, height } = containerRef.current.getBoundingClientRect();
			layout.width = width;
			layout.height = height;
		} else {
			layout.width = 0;
			layout.height = 0;
		}
	}, [isHovering, plot]);

	if (!plot || !isHovering) {
		return null;
	}

	return createPortal(
		<div
			className={cx('tooltip-plugin-container', { pinned: isPinned })}
			style={{
				...style,
				maxWidth: `${maxWidth}px`,
				maxHeight: `${maxHeight}px`,
				width: '100%',
			}}
			aria-live="polite"
			aria-atomic="true"
			ref={containerRef}
		>
			{contents}
		</div>,
		portalRoot.current,
	);
}
