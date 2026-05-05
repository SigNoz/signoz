import { ReactNode } from 'react';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PrecisionOption } from 'components/Graph/types';
import uPlot from 'uplot';

import { UPlotConfigBuilder } from '../config/UPlotConfigBuilder';

/**
 * Props for the Plot component
 */
export interface UPlotChartProps {
	/**
	 * uPlot configuration builder
	 */
	config: UPlotConfigBuilder;

	/**
	 * Chart data in uPlot.AlignedData format
	 */
	data: uPlot.AlignedData;

	/**
	 * Chart width in pixels
	 */
	width: number;

	/**
	 * Chart height in pixels
	 */
	height: number;

	/**
	 * Optional callback when plot instance is created or destroyed.
	 * Called with the uPlot instance on create, and with null when the plot is destroyed.
	 */
	plotRef?: (u: uPlot | null) => void;

	/**
	 * Optional callback when plot is destroyed
	 */
	onDestroy?: (u: uPlot) => void;

	/**
	 * Children elements (typically plugins)
	 */
	children?: ReactNode;

	/**
	 * Test ID for the container div
	 */
	'data-testid'?: string;
}

export interface TooltipRenderArgs {
	uPlotInstance: uPlot;
	dataIndexes: Array<number | null>;
	seriesIndex: number | null;
	isPinned: boolean;
	dismiss: () => void;
	viaSync: boolean;
	/** In Tooltip sync mode, limits which series are rendered in the receiver tooltip.
	 * null = no filtering; [] = no matches (tooltip hidden upstream); [...] = allowed indexes */
	syncedSeriesIndexes?: number[] | null;
}

export interface IRenderTooltipFooterArgs {
	pinKey?: string;
	isPinned: boolean;
	dismiss: () => void;
}

export interface BaseTooltipProps {
	id: string;
	showTooltipHeader?: boolean;
	canPinTooltip?: boolean;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	content?: TooltipContentItem[];
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => ReactNode;
	timezone?: Timezone;
}

export interface TimeSeriesTooltipProps
	extends BaseTooltipProps, TooltipRenderArgs {}

export interface BarTooltipProps extends BaseTooltipProps, TooltipRenderArgs {
	isStackedBarChart?: boolean;
}

export interface HistogramTooltipProps
	extends BaseTooltipProps, TooltipRenderArgs {}

export type TooltipProps =
	| TimeSeriesTooltipProps
	| BarTooltipProps
	| HistogramTooltipProps;

export enum LegendPosition {
	BOTTOM = 'bottom',
	RIGHT = 'right',
}
export interface LegendConfig {
	position: LegendPosition;
}
export interface LegendProps {
	position?: LegendPosition;
	config: UPlotConfigBuilder;
	averageLegendWidth?: number;
}

export interface TooltipContentItem {
	label: string;
	value: number;
	tooltipValue: string;
	color: string;
	isActive: boolean;
}
