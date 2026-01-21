import { useCallback, useEffect, useRef } from 'react';
import uPlot, { AlignedData, Options } from 'uplot';

import { PlotProps } from './types';

/**
 * Check if dimensions have changed
 */
function sameDimensions(prev: PlotProps, next: PlotProps): boolean {
	return next.width === prev.width && next.height === prev.height;
}

/**
 * Check if data has changed (reference equality)
 */
function sameData(prev: PlotProps, next: PlotProps): boolean {
	return next.data === prev.data;
}

/**
 * Check if config builder has changed (reference equality)
 */
function sameConfig(prev: PlotProps, next: PlotProps): boolean {
	return next.config === prev.config;
}

/**
 * Plot component for rendering uPlot charts using the builder pattern
 * Manages uPlot instance lifecycle and handles updates efficiently
 */
export default function UPlotChart({
	config,
	data,
	width,
	height,
	plotRef,
	onDestroy,
	children,
	'data-testid': testId = 'uplot-main-div',
}: PlotProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const plotInstanceRef = useRef<uPlot | null>(null);
	const prevPropsRef = useRef<PlotProps | null>(null);

	/**
	 * Initialize or reinitialize the plot
	 */
	const createPlot = useCallback(() => {
		if (!containerRef.current || width === 0 || height === 0) {
			return;
		}

		// Destroy existing plot
		if (plotInstanceRef.current) {
			onDestroy?.(plotInstanceRef.current);
			plotInstanceRef.current.destroy();
			plotInstanceRef.current = null;
		}

		// Build configuration from builder
		const configOptions = config.getConfig();

		// Merge with dimensions
		const plotConfig: Options = {
			width: Math.floor(width),
			height: Math.floor(height),
			...configOptions,
		} as Options;

		// Create new plot instance
		const plot = new uPlot(plotConfig, data as AlignedData, containerRef.current);

		if (plotRef) {
			plotRef(plot);
		}

		plotInstanceRef.current = plot;
	}, [config, data, width, height, plotRef, onDestroy]);

	/**
	 * Cleanup on unmount
	 */
	useEffect(
		() => (): void => {
			if (plotInstanceRef.current) {
				onDestroy?.(plotInstanceRef.current);
				plotInstanceRef.current.destroy();
				plotInstanceRef.current = null;
			}
		},
		[onDestroy],
	);

	/**
	 * Handle initialization and prop changes
	 */
	useEffect(() => {
		const prevProps = prevPropsRef.current;
		const currentProps = { config, data, width, height };

		// First render - initialize
		if (!prevProps) {
			createPlot();
			prevPropsRef.current = currentProps;
			return;
		}

		// Update dimensions without reinitializing if only size changed
		if (!sameDimensions(prevProps, currentProps) && plotInstanceRef.current) {
			plotInstanceRef.current.setSize({
				width: Math.floor(width),
				height: Math.floor(height),
			});
		}

		// Reinitialize if config changed
		if (!sameConfig(prevProps, currentProps)) {
			createPlot();
		}
		// Update data if only data changed
		else if (!sameData(prevProps, currentProps) && plotInstanceRef.current) {
			plotInstanceRef.current.setData(data as AlignedData);
		}

		prevPropsRef.current = currentProps;
	}, [config, data, width, height, createPlot]);

	return (
		<div style={{ position: 'relative' }}>
			<div ref={containerRef} data-testid={testId} />
			{children}
		</div>
	);
}
