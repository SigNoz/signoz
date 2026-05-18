import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';
import uPlot from 'uplot';
import logEvent from 'api/common/logEvent';

import { createSyncDisplayHook } from './syncDisplayHook';
import {
	createInitialControllerState,
	createSetCursorHandler,
	createSetLegendHandler,
	createSetSeriesHandler,
	getPlot,
	isScrollEventInPlot,
	updatePlotVisibility,
	updateWindowSize,
} from './tooltipController';
import {
	DashboardCursorSync,
	DEFAULT_PIN_TOOLTIP_KEY,
	SyncTooltipFilterMode,
	TooltipControllerContext,
	TooltipControllerState,
	TooltipLayoutInfo,
	TooltipPluginProps,
	TooltipViewState,
} from './types';
import {
	buildClickData,
	createInitialViewState,
	createLayoutObserver,
} from './utils';
import { Events } from 'constants/events';

import Styles from './TooltipPlugin.module.scss';

// Delay before hiding an unpinned tooltip when the cursor briefly leaves
// the plot – this avoids flicker when moving between nearby points.
const HOVER_DISMISS_DELAY_MS = 100;

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function TooltipPlugin({
	config,
	render,
	maxWidth = 450,
	maxHeight = 600,
	syncMode = DashboardCursorSync.None,
	syncKey = '_tooltip_sync_global_',
	syncMetadata,
	pinnedTooltipElement,
	canPinTooltip = false,
	pinKey = DEFAULT_PIN_TOOLTIP_KEY,
	onClick,
}: TooltipPluginProps): JSX.Element | null {
	const containerRef = useRef<HTMLDivElement>(null);
	const rafId = useRef<number | null>(null);
	const dismissTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
	const layoutRef = useRef<TooltipLayoutInfo>();
	const renderRef = useRef(render);
	renderRef.current = render;
	const [portalRoot, setPortalRoot] = useState<HTMLElement>(
		(document.fullscreenElement as HTMLElement) ?? document.body,
	);

	// React-managed snapshot of what should be rendered. The controller
	// owns the interaction state and calls `updateState` when a visible
	// change should trigger a React re-render.
	const [viewState, setState] = useState<TooltipViewState>(
		createInitialViewState,
	);
	const { hasPlot, isHovering, isPinned, contents, style } = viewState;

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

		/**
		 * Plot lifecycle and GC: viewState uses hasPlot (boolean), not the plot
		 * reference; clearPlotReferences runs in cleanup so
		 * detached canvases can be garbage collected.
		 */
		const clearPlotReferences = (): void => {
			controller.plot = null;
			updateState({ hasPlot: false });
		};

		const syncTooltipWithDashboard = syncMode === DashboardCursorSync.Tooltip;

		// Enable uPlot's built-in cursor sync when requested so that
		// crosshair / tooltip can follow the dashboard-wide cursor.
		let removeSyncDisplayHook: (() => void) | null = null;
		if (syncMode !== DashboardCursorSync.None && config.scales[0]?.props.time) {
			config.setCursor({
				sync: {
					key: syncKey,
					scales:
						syncMode === DashboardCursorSync.Crosshair ? ['x', 'y'] : ['x', null],
				},
			});

			removeSyncDisplayHook = config.addHook(
				'setCursor',
				createSyncDisplayHook(syncKey, syncMetadata, controller),
			);
		}

		// Dismiss the tooltip when the user clicks / presses a key
		// outside the tooltip container while it is pinned.
		const onOutsideInteraction = (event: Event): void => {
			const target = event.target as Node;
			if (!containerRef.current?.contains(target)) {
				// Don't dismiss if the click landed inside any other pinned tooltip.
				const isInsideAnyPinnedTooltip =
					(target as Element).closest?.('[data-pinned="true"]') != null;
				if (!isInsideAnyPinnedTooltip) {
					dismissTooltip();
				}
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
			const plot = getPlot(controller);
			if (plot) {
				// @ts-expect-error uPlot cursor lock is not working as expected
				plot.cursor._lock = controller.pinned;
			}
		}

		// Attach / detach global listeners when pin state changes so
		// we can detect when the user interacts outside the tooltip.
		// Keyboard unpinning is handled exclusively in handleKeyDown so
		// that only P (toggle) and Escape (release) can dismiss — not
		// arbitrary keystrokes like arrow keys or Tab.
		function toggleOutsideListeners(enable: boolean): void {
			if (enable) {
				document.addEventListener('mousedown', onOutsideInteraction, true);
			} else {
				document.removeEventListener('mousedown', onOutsideInteraction, true);
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
			controller.clickData = null;
			const plot = getPlot(controller);
			if (plot) {
				plot.setCursor({ left: -10, top: -10 });
			}
			scheduleRender(isPinnedBeforeDismiss);
		}

		// Build the React node to be rendered inside the tooltip by
		// delegating to the caller-provided `render` function.
		function createTooltipContents(): React.ReactNode {
			const plot = getPlot(controller);
			if (!controller.hoverActive || !plot) {
				return null;
			}
			const filterMode =
				syncMetadata?.filterMode ?? SyncTooltipFilterMode.Filtered;
			// In Filtered Tooltip sync mode, suppress the receiver tooltip entirely
			// when no receiver series match the source panel's focused series. In
			// All mode the tooltip still renders with every series visible.
			if (
				syncTooltipWithDashboard &&
				filterMode === SyncTooltipFilterMode.Filtered &&
				controller.cursorDrivenBySync &&
				Array.isArray(controller.syncedSeriesIndexes) &&
				controller.syncedSeriesIndexes.length === 0
			) {
				return null;
			}
			return renderRef.current({
				uPlotInstance: plot,
				dataIndexes: controller.seriesIndexes,
				seriesIndex: controller.focusedSeriesIndex,
				isPinned: controller.pinned,
				dismiss: dismissTooltip,
				viaSync: controller.cursorDrivenBySync,
				syncedSeriesIndexes: controller.syncedSeriesIndexes,
				syncFilterMode: filterMode,
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
				clickData: controller.clickData,
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

		// Handles all tooltip-pin keyboard interactions:
		//   Escape  — always releases the tooltip when pinned (never steals Escape
		//             from other handlers since we do not call stopPropagation).
		//   pinKey  — toggles: pins when hovering+unpinned, unpins when pinned.
		const handleKeyDown = (event: KeyboardEvent): void => {
			// Escape: release-only (never toggles on).
			if (event.key === 'Escape') {
				if (controller.pinned) {
					logEvent(Events.TOOLTIP_UNPINNED, {
						id: config.getId(),
					});
					dismissTooltip();
				}
				return;
			}

			if (event.key.toLowerCase() !== pinKey.toLowerCase()) {
				return;
			}

			// Toggle off: P pressed while already pinned.
			if (controller.pinned) {
				logEvent(Events.TOOLTIP_UNPINNED, {
					id: config.getId(),
				});
				dismissTooltip();
				return;
			}

			// Toggle on: P pressed while hovering.
			const plot = getPlot(controller);
			if (
				!plot ||
				!controller.hoverActive ||
				controller.focusedSeriesIndex == null
			) {
				return;
			}

			const cursorLeft = plot.cursor.left ?? -1;
			const cursorTop = plot.cursor.top ?? -1;
			if (cursorLeft < 0 || cursorTop < 0) {
				return;
			}

			const plotRect = plot.over.getBoundingClientRect();
			const syntheticEvent = {
				clientX: plotRect.left + cursorLeft,
				clientY: plotRect.top + cursorTop,
				target: plot.over,
				offsetX: cursorLeft,
				offsetY: cursorTop,
			} as unknown as MouseEvent;

			controller.clickData = buildClickData(syntheticEvent, plot);
			controller.pinned = true;
			logEvent(Events.TOOLTIP_PINNED, {
				id: config.getId(),
			});
			scheduleRender(true);
		};

		// Forward overlay clicks to the consumer-provided onClick callback.
		const handleOverClick = (event: MouseEvent): void => {
			const plot = getPlot(controller);
			/**
			 * Only trigger onClick if the click happened on the plot overlay and there is a focused series.
			 * It also ensures that clicks only trigger onClick when there is a relevant data point (i.e. a focused series) to provide context for the click.
			 */
			if (
				plot &&
				event.target === plot.over &&
				controller.focusedSeriesIndex != null
			) {
				const clickData = buildClickData(event, plot);
				onClick?.(clickData);
			}
		};

		let overClickHandler: ((event: MouseEvent) => void) | null = null;

		// Called once per uPlot instance; used to store the instance on the controller.
		const handleInit = (u: uPlot): void => {
			controller.plot = u;
			updateState({ hasPlot: true });
			if (onClick) {
				overClickHandler = handleOverClick;
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
		if (canPinTooltip) {
			document.addEventListener('keydown', handleKeyDown, true);
		}

		return (): void => {
			layoutRef.current?.observer.disconnect();
			window.removeEventListener('resize', handleWindowResize);
			window.removeEventListener('scroll', handleScroll, true);
			document.removeEventListener('mousedown', onOutsideInteraction, true);
			if (canPinTooltip) {
				document.removeEventListener('keydown', handleKeyDown, true);
			}
			cancelPendingRender();
			removeReadyHook();
			removeInitHook();
			removeSetDataHook();
			removeSetSeriesHook();
			removeSetLegendHook();
			removeSetCursorHook();
			removeSyncDisplayHook?.();
			if (overClickHandler) {
				const plot = getPlot(controller);
				plot?.over.removeEventListener('click', overClickHandler);
				overClickHandler = null;
			}
			clearPlotReferences();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config]);

	const resolvePortalRoot = useCallback((): void => {
		setPortalRoot((document.fullscreenElement as HTMLElement) ?? document.body);
	}, []);

	useLayoutEffect((): (() => void) => {
		resolvePortalRoot();
		document.addEventListener('fullscreenchange', resolvePortalRoot);

		return (): void => {
			document.removeEventListener('fullscreenchange', resolvePortalRoot);
		};
	}, [resolvePortalRoot]);

	useLayoutEffect((): void => {
		if (!hasPlot || !layoutRef.current) {
			return;
		}
		const layout = layoutRef.current;
		layout.observer.disconnect();

		if (containerRef.current) {
			layout.observer.observe(containerRef.current);
			const { width, height } = containerRef.current.getBoundingClientRect();
			layout.width = width;
			layout.height = height;
		} else {
			layout.width = 0;
			layout.height = 0;
		}
	}, [isHovering, hasPlot]);

	const tooltipBody = useMemo(() => {
		if (isPinned) {
			if (pinnedTooltipElement != null && viewState.clickData != null) {
				return pinnedTooltipElement(viewState.clickData);
			}
			// No custom pinned element — keep showing the last hover contents.
			return contents ?? null;
		}

		if (isHovering) {
			return contents;
		}

		return null;
	}, [
		isPinned,
		pinnedTooltipElement,
		viewState.clickData,
		isHovering,
		contents,
	]);
	const isTooltipVisible = tooltipBody != null;

	if (!hasPlot) {
		return null;
	}

	return createPortal(
		<div
			className={cx(Styles.tooltipPluginContainer, {
				[Styles.visible]: isTooltipVisible,
			})}
			style={{
				...style,
				maxWidth: `${maxWidth}px`,
				maxHeight: `${maxHeight}px`,
			}}
			aria-live="polite"
			aria-atomic="true"
			aria-hidden={!isTooltipVisible}
			ref={containerRef}
			data-pinned={isPinned}
			data-testid="tooltip-plugin-container"
		>
			{tooltipBody}
		</div>,
		portalRoot,
	);
}
