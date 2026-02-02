import { getStoredSeriesVisibility } from 'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils';
import { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import { thresholdsDrawHook } from 'lib/uPlotV2/hooks/useThresholdsDrawHook';
import { merge } from 'lodash-es';
import noop from 'lodash-es/noop';
import uPlot, { Cursor, Hooks, Options } from 'uplot';

import {
	ConfigBuilder,
	ConfigBuilderProps,
	DEFAULT_CURSOR_CONFIG,
	DEFAULT_PLOT_CONFIG,
	LegendItem,
} from './types';
import { AxisProps, UPlotAxisBuilder } from './UPlotAxisBuilder';
import { ScaleProps, UPlotScaleBuilder } from './UPlotScaleBuilder';
import { SeriesProps, UPlotSeriesBuilder } from './UPlotSeriesBuilder';

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
export class UPlotConfigBuilder extends ConfigBuilder<
	ConfigBuilderProps,
	Partial<Options>
> {
	series: UPlotSeriesBuilder[] = [];

	private axes: Record<string, UPlotAxisBuilder> = {};

	readonly scales: UPlotScaleBuilder[] = [];

	private bands: uPlot.Band[] = [];

	private cursor: Cursor | undefined;

	private hooks: Hooks.Arrays = {};

	private plugins: uPlot.Plugin[] = [];

	private padding: [number, number, number, number] | undefined;

	private legend: LegendConfig | undefined;

	private focus: uPlot.Focus | undefined;

	private select: uPlot.Select | undefined;

	private thresholds: Record<string, ThresholdsDrawHookOptions> = {};

	private tzDate: ((timestamp: number) => Date) | undefined;

	private widgetId: string | undefined;

	private onDragSelect: (startTime: number, endTime: number) => void;

	private cleanups: Array<() => void> = [];

	constructor(args?: ConfigBuilderProps) {
		super(args ?? {});
		const { widgetId, onDragSelect, tzDate } = args ?? {};
		if (widgetId) {
			this.widgetId = widgetId;
		}

		if (tzDate) {
			this.tzDate = tzDate;
		}

		this.onDragSelect = noop;

		if (onDragSelect) {
			this.onDragSelect = onDragSelect;
			// Add a hook to handle the select event
			const cleanup = this.addHook('setSelect', (self: uPlot): void => {
				const selection = self.select;
				// Only trigger onDragSelect when there's an actual drag range (width > 0)
				// A click without dragging produces width === 0, which should be ignored
				if (selection && selection.width > 0) {
					const startTime = self.posToVal(selection.left, 'x');
					const endTime = self.posToVal(selection.left + selection.width, 'x');
					this.onDragSelect(startTime * 1000, endTime * 1000);
				}
			});
			this.cleanups.push(cleanup);
		}
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
	addHook<T extends keyof Hooks.Defs>(type: T, hook: Hooks.Defs[T]): () => void {
		if (!this.hooks[type]) {
			this.hooks[type] = [];
		}
		(this.hooks[type] as Hooks.Defs[T][]).push(hook);

		// Return a function to remove the hook when the component unmounts
		return (): void => {
			const idx = (this.hooks[type] as Hooks.Defs[T][]).indexOf(hook);
			if (idx !== -1) {
				(this.hooks[type] as Hooks.Defs[T][]).splice(idx, 1);
			}
		};
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
	addThresholds(options: ThresholdsDrawHookOptions): void {
		if (!this.thresholds[options.scaleKey]) {
			this.thresholds[options.scaleKey] = options;
			const cleanup = this.addHook('draw', thresholdsDrawHook(options));
			this.cleanups.push(cleanup);
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
	 * Get legend items with visibility state restored from localStorage if available
	 */
	getLegendItems(): Record<number, LegendItem> {
		const visibilityMap = this.widgetId
			? getStoredSeriesVisibility(this.widgetId)
			: null;
		return this.series.reduce((acc, s: UPlotSeriesBuilder, index: number) => {
			const seriesConfig = s.getConfig();
			const label = seriesConfig.label ?? '';
			const seriesIndex = index + 1; // +1 because the first series is the timestamp

			// Priority: stored visibility > series config > default (true)
			const show = visibilityMap?.get(label) ?? seriesConfig.show ?? true;

			acc[seriesIndex] = {
				seriesIndex,
				color: seriesConfig.stroke,
				label,
				show,
			};

			return acc;
		}, {} as Record<number, LegendItem>);
	}

	/**
	 * Remove all hooks and cleanup functions
	 */
	destroy(): void {
		this.cleanups.forEach((cleanup) => cleanup());
	}

	/**
	 * Get the widget id
	 */
	getWidgetId(): string | undefined {
		return this.widgetId;
	}

	/**
	 * Build the final uPlot.Options configuration
	 */
	getConfig(): Partial<Options> {
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

		return config;
	}
}
