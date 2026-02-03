import { CSSProperties } from 'react';

import { TooltipRenderArgs } from '../../components/types';
import { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';

export const TOOLTIP_OFFSET = 10;

export enum DashboardCursorSync {
	Crosshair,
	None,
	Tooltip,
}

export interface TooltipViewState {
	plot?: uPlot | null;
	style: Partial<CSSProperties>;
	isHovering: boolean;
	isPinned: boolean;
	dismiss: () => void;
	contents?: React.ReactNode;
}

export interface TooltipLayoutInfo {
	observer: ResizeObserver;
	width: number;
	height: number;
}

export interface TooltipPluginProps {
	config: UPlotConfigBuilder;
	canPinTooltip?: boolean;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	render: (args: TooltipRenderArgs) => React.ReactNode;
	maxWidth?: number;
	maxHeight?: number;
}

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
	canPinTooltip: boolean;
	createTooltipContents: () => React.ReactNode;
	scheduleRender: (updatePinned?: boolean) => void;
	dismissTooltip: () => void;
}
