import type {
	CSSProperties,
	MutableRefObject,
	ReactNode,
	RefObject,
} from 'react';
import type uPlot from 'uplot';

import type { TooltipRenderArgs } from '../../components/types';
import type { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';

export const TOOLTIP_OFFSET = 10;

export enum DashboardCursorSync {
	Crosshair,
	None,
	Tooltip,
}

export interface TooltipViewState {
	/** Whether a plot instance exists; plot reference is in controller, not state. */
	hasPlot?: boolean;
	style: Partial<CSSProperties>;
	isHovering: boolean;
	isPinned: boolean;
	dismiss: () => void;
	clickData: TooltipClickData | null;
	contents?: ReactNode;
}

export interface TooltipLayoutInfo {
	observer: ResizeObserver;
	width: number;
	height: number;
}

export interface TooltipSyncMetadata {
	yAxisUnit?: string;
}

export interface TooltipPluginProps {
	config: UPlotConfigBuilder;
	canPinTooltip?: boolean;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	syncMetadata?: TooltipSyncMetadata;
	render: (args: TooltipRenderArgs) => ReactNode;
	pinnedTooltipElement?: (clickData: TooltipClickData) => ReactNode;
	maxWidth?: number;
	maxHeight?: number;
}

export interface TooltipClickData {
	xValue: number;
	yValue: number;
	focusedSeries: {
		seriesIndex: number;
		seriesName: string;
		value: number;
		color: string;
	} | null;
	clickedDataTimestamp: number;
	mouseX: number;
	mouseY: number;
	absoluteMouseX: number;
	absoluteMouseY: number;
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
	isAnySeriesActive: boolean;
	pinned: boolean;
	clickData: TooltipClickData | null;
	style: TooltipViewState['style'];
	horizontalOffset: number;
	verticalOffset: number;
	seriesIndexes: Array<number | null>;
	focusedSeriesIndex: number | null;
	cursorDrivenBySync: boolean;
	plotWithinViewport: boolean;
	windowWidth: number;
	windowHeight: number;
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
	layoutRef: MutableRefObject<TooltipLayoutInfo | undefined>;
	containerRef: RefObject<HTMLDivElement | null>;
	rafId: MutableRefObject<number | null>;
	updateState: (updates: Partial<TooltipViewState>) => void;
	renderRef: MutableRefObject<(args: TooltipRenderArgs) => ReactNode>;
	syncMode: DashboardCursorSync;
	syncKey: string;
	canPinTooltip: boolean;
	createTooltipContents: () => React.ReactNode;
	scheduleRender: (updatePinned?: boolean) => void;
	dismissTooltip: () => void;
}
