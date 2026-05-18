import type {
	CSSProperties,
	MutableRefObject,
	ReactNode,
	RefObject,
} from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type uPlot from 'uplot';

import type { TooltipRenderArgs } from '../../components/types';
import type { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';

export const TOOLTIP_OFFSET = 10;

// Default key that pins the tooltip while hovering over the chart.
export const DEFAULT_PIN_TOOLTIP_KEY = 'p';

export enum DashboardCursorSync {
	Crosshair = 'crosshair',
	None = 'none',
	Tooltip = 'tooltip',
}

/**
 * Controls whether a synced tooltip filters series by groupBy intersection
 * or shows every series with the matching ones highlighted.
 */
export enum SyncTooltipFilterMode {
	Filtered = 'filtered',
	All = 'all',
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
	groupByPerQuery?: Record<string, BaseAutocompleteData[]>;
	filterMode?: SyncTooltipFilterMode;
}

export interface TooltipPluginProps {
	config: UPlotConfigBuilder;
	canPinTooltip?: boolean;
	/** Key that pins the tooltip while hovering. Defaults to DEFAULT_PIN_TOOLTIP_KEY ('l'). */
	pinKey?: string;
	/** Called when the user clicks the uPlot overlay. Receives resolved click data. */
	onClick?: (clickData: TooltipClickData) => void;
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
	/** Receiver-side series filtering for Tooltip sync mode.
	 * null  = no filtering (source panel or no groupBy configured)
	 * []    = no matching series found → hide the synced tooltip
	 * [...] = only these 1-based series indexes should appear in the synced tooltip */
	syncedSeriesIndexes: number[] | null;
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
