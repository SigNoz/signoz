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
	isPinningTooltipEnabled?: boolean;
	syncMode?: DashboardCursorSync;
	syncKey?: string;
	render: (args: TooltipRenderArgs) => React.ReactNode;
	maxWidth?: number;
	maxHeight?: number;
}
