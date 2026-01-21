import { merge } from 'lodash-es';
import _noop from 'lodash-es/noop';
import uPlot, { Cursor, Hooks, Options } from 'uplot';

import {
	DEFAULT_CURSOR_CONFIG,
	DEFAULT_PLOT_CONFIG,
	LegendItem,
	UPlotThresholdOptions,
} from './types';
import { AxisProps, UPlotAxisBuilder } from './UPlotAxisBuilder';
import { ScaleProps, UPlotScaleBuilder } from './UPlotScaleBuilder';
import { SeriesProps, UPlotSeriesBuilder } from './UPlotSeriesBuilder';
import { thresholdsDrawHook } from './UPlotThresolds';

/**
 * Type definitions for uPlot option objects
 */
type LegendConfig = {
	show?: boolean;
	live?: boolean;
	isolate?: boolean;
	[key: string]: unknown;
};

/**
 * Main builder orchestrator for uPlot configuration
 * Manages axes, scales, series, and hooks in a composable way
 */
export class UPlotConfigBuilder {
	series: UPlotSeriesBuilder[] = [];

	private axes: Record<string, UPlotAxisBuilder> = {};

	readonly scales: UPlotScaleBuilder[] = [];

	private bands: uPlot.Band[] = [];

	private cursor: Cursor | undefined;

	private hooks: Hooks.Arrays = {};

	private plugins: uPlot.Plugin[] = [];

	private cachedConfig: Partial<Options> | undefined;

	private padding: [number, number, number, number] | undefined;

	private legend: LegendConfig | undefined;

	private focus: uPlot.Focus | undefined;

	private select: uPlot.Select | undefined;

	private thresholds: Record<string, UPlotThresholdOptions> = {};

	private tzDate: ((timestamp: number) => Date) | undefined;

	private widgetId: string | undefined;
	private onDragSelect: (startTime: number, endTime: number) => void | undefined;

	constructor(args?: {
		widgetId?: string;
		onDragSelect?: (startTime: number, endTime: number) => void;
	}) {
		const { widgetId, onDragSelect } = args ?? {};
		if (widgetId) {
			this.widgetId = widgetId;
		}
		this.onDragSelect = onDragSelect ?? _noop;

		// Add a hook to handle the select event
		this.addHook('setSelect', (self: uPlot): void => {
			const selection = self.select;
			if (selection) {
				const startTime = self.posToVal(selection.left, 'x');
				const endTime = self.posToVal(selection.left + selection.width, 'x');
				this.onDragSelect(startTime * 1000, endTime * 1000);
			}
		});
	}

	/**
	 * Add or merge an axis configuration
	 */
	addAxis(props: AxisProps): void {
		const { scaleKey } = props;
		if (this.axes[scaleKey]) {
			this.axes[scaleKey].merge?.(props);
			return;
		}
		this.axes[scaleKey] = new UPlotAxisBuilder(props);
	}

	/**
	 * Add or merge a scale configuration
	 */
	addScale(props: ScaleProps): void {
		const current = this.scales.find((v) => v.props.scaleKey === props.scaleKey);
		if (current) {
			current.merge?.(props);
			return;
		}
		this.scales.push(new UPlotScaleBuilder(props));
	}

	/**
	 * Add a series configuration
	 */
	addSeries(props: SeriesProps): void {
		this.series.push(new UPlotSeriesBuilder(props));
	}

	/**
	 * Add a hook for extensibility
	 */
	addHook<T extends keyof Hooks.Defs>(type: T, hook: Hooks.Defs[T]): void {
		if (!this.hooks[type]) {
			this.hooks[type] = [];
		}
		(this.hooks[type] as Hooks.Defs[T][]).push(hook);
	}

	/**
	 * Add a plugin
	 */
	addPlugin(plugin: uPlot.Plugin): void {
		this.plugins.push(plugin);
	}

	/**
	 * Add thresholds configuration
	 */
	addThresholds(options: UPlotThresholdOptions): void {
		if (!this.thresholds[options.scaleKey]) {
			this.thresholds[options.scaleKey] = options;
			this.addHook('draw', thresholdsDrawHook(options));
		}
	}

	/**
	 * Set bands for stacked charts
	 */
	setBands(bands: uPlot.Band[]): void {
		this.bands = bands;
	}

	/**
	 * Set cursor configuration
	 */
	setCursor(cursor: Cursor): void {
		this.cursor = merge({}, this.cursor, cursor);
	}

	/**
	 * Set padding
	 */
	setPadding(padding: [number, number, number, number]): void {
		this.padding = padding;
	}

	/**
	 * Set legend configuration
	 */
	setLegend(legend: LegendConfig): void {
		this.legend = legend;
	}

	/**
	 * Set focus configuration
	 */
	setFocus(focus: uPlot.Focus): void {
		this.focus = focus;
	}

	/**
	 * Set select configuration
	 */
	setSelect(select: uPlot.Select): void {
		this.select = select;
	}

	/**
	 * Set timezone date function
	 */
	setTzDate(tzDate: (timestamp: number) => Date): void {
		this.tzDate = tzDate;
	}

	/**
	 * Get legend items
	 */
	getLegendItems(): LegendItem[] {
		// Check if the widgetId is set and if it is, then get the legend items from the localstorage
		return this.series.map((s: UPlotSeriesBuilder, index: number) => {
			const seriesConfig = s.getConfig();
			return {
				seriesIndex: index + 1, // +1 because the first series is the timestamp
				color: seriesConfig.stroke,
				label: seriesConfig.label,
				focused: true,
				visible: seriesConfig.show ?? true,
			};
		});
	}

	/**
	 * Build the final uPlot.Options configuration
	 */
	getConfig(): Partial<Options> {
		if (this.cachedConfig) {
			return this.cachedConfig;
		}

		const config: Partial<Options> = {
			...DEFAULT_PLOT_CONFIG,
		};

		config.series = [
			{ value: (): string => '' }, // Base series for timestamp
			...this.series.map((s) => s.getConfig()),
		];
		config.axes = Object.values(this.axes).map((a) => a.getConfig());
		config.scales = this.scales.reduce(
			(acc, s) => ({ ...acc, ...s.getConfig() }),
			{} as Record<string, uPlot.Scale>,
		);

		config.hooks = this.hooks;
		config.select = this.select;

		config.cursor = merge({}, DEFAULT_CURSOR_CONFIG, this.cursor);
		config.tzDate = this.tzDate;
		config.plugins = this.plugins.length > 0 ? this.plugins : undefined;
		config.bands = this.bands.length > 0 ? this.bands : undefined;

		if (Array.isArray(this.padding)) {
			config.padding = this.padding;
		}
		if (this.legend) {
			config.legend = this.legend;
		}
		if (this.focus) {
			config.focus = this.focus;
		}

		this.cachedConfig = config;
		return config;
	}
}
