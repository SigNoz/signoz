import { ReactNode } from 'react';
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
}

export type TooltipProps = TooltipRenderArgs & {
	timezone: string;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
};

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
	legendsPerSet?: number;
}

export interface TooltipContentItem {
	label: string;
	value: number;
	tooltipValue: string;
	color: string;
	isActive: boolean;
}
