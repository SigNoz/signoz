import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Sentry from '@sentry/react';
import { Typography } from 'antd';
import { isEqual } from 'lodash-es';
import { LineChart } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import uPlot, { AlignedData, Options } from 'uplot';

import { UPlotConfigBuilder } from '../config/UPlotConfigBuilder';
import { usePlotContext } from '../context/PlotContext';
import { UPlotChartProps } from './types';

/**
 * Check if dimensions have changed
 */
function sameDimensions(prev: UPlotChartProps, next: UPlotChartProps): boolean {
	return next.width === prev.width && next.height === prev.height;
}

/**
 * Check if data has changed (value equality)
 */
function sameData(prev: UPlotChartProps, next: UPlotChartProps): boolean {
	return isEqual(next.data, prev.data);
}

/**
 * Check if config builder has changed (value equality)
 */
function sameConfig(prev: UPlotChartProps, next: UPlotChartProps): boolean {
	return isEqual(next.config, prev.config);
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
}: UPlotChartProps): JSX.Element {
	const { setPlotContextInitialState } = usePlotContext();
	const containerRef = useRef<HTMLDivElement>(null);
	const plotInstanceRef = useRef<uPlot | null>(null);
	const prevPropsRef = useRef<UPlotChartProps | null>(null);
	const configUsedForPlotRef = useRef<UPlotConfigBuilder | null>(null);

	/**
	 * Destroy the existing plot instance if present.
	 */
	const destroyPlot = useCallback((): void => {
		if (plotInstanceRef.current) {
			onDestroy?.(plotInstanceRef.current);
			// Clean up the config builder that was used to create this plot (not the current prop)
			if (configUsedForPlotRef.current) {
				configUsedForPlotRef.current.destroy();
			}
			configUsedForPlotRef.current = null;

			plotInstanceRef.current.destroy();
			plotInstanceRef.current = null;
			setPlotContextInitialState({ uPlotInstance: null });
			plotRef?.(null);
		}
	}, [onDestroy, plotRef, setPlotContextInitialState]);

	/**
	 * Initialize or reinitialize the plot
	 */
	const createPlot = useCallback(() => {
		// Destroy existing plot first
		destroyPlot();

		if (!containerRef.current || width === 0 || height === 0) {
			return;
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
		setPlotContextInitialState({
			uPlotInstance: plot,
			widgetId: config.getWidgetId(),
		});

		plotInstanceRef.current = plot;
		configUsedForPlotRef.current = config;
	}, [
		config,
		data,
		width,
		height,
		plotRef,
		destroyPlot,
		setPlotContextInitialState,
	]);

	/**
	 * Destroy plot when data becomes empty to prevent memory leaks.
	 * When the "No Data" UI is shown, the container div is unmounted,
	 * but without this effect the plot instance would remain in memory.
	 */
	const isDataEmpty = useMemo(() => {
		return !!(data && data[0] && data[0].length === 0);
	}, [data]);

	useEffect(() => {
		if (isDataEmpty) {
			destroyPlot();
		}
	}, [isDataEmpty, destroyPlot]);

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

		// Check if the plot instance's container has been unmounted (e.g., after "No Data" state)
		// If so, we need to recreate the plot with the new container
		const isPlotOrphaned =
			plotInstanceRef.current &&
			plotInstanceRef.current.root !== containerRef.current;

		// Update dimensions without reinitializing if only size changed
		if (
			!sameDimensions(prevProps, currentProps) &&
			plotInstanceRef.current &&
			!isPlotOrphaned
		) {
			plotInstanceRef.current.setSize({
				width: Math.floor(width),
				height: Math.floor(height),
			});
		}

		// Reinitialize if config changed or if the plot was orphaned (container changed)
		if (!sameConfig(prevProps, currentProps) || isPlotOrphaned) {
			createPlot();
		}
		// Update data if only data changed
		else if (!sameData(prevProps, currentProps) && plotInstanceRef.current) {
			plotInstanceRef.current.setData(data as AlignedData);
		}

		prevPropsRef.current = currentProps;
	}, [config, data, width, height, createPlot]);

	if (isDataEmpty) {
		return (
			<div
				className="uplot-no-data not-found"
				style={{
					width: `${width}px`,
					height: `${height}px`,
				}}
			>
				<LineChart size={48} strokeWidth={0.5} />
				<Typography>No Data</Typography>
			</div>
		);
	}

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div style={{ position: 'relative' }}>
				<div ref={containerRef} data-testid={testId} />
				{children}
			</div>
		</Sentry.ErrorBoundary>
	);
}
