import { ReactNode } from 'react';
import uPlot from 'uplot';

import { UPlotConfigBuilder } from '../config/UPlotConfigBuilder';

/**
 * Props for the Plot component
 */
export interface PlotProps {
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
	 * Optional callback when plot instance is created
	 */
	plotRef?: (u: uPlot) => void;

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
