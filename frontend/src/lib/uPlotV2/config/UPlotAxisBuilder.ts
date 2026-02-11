import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { PANEL_TYPES } from 'constants/queryBuilder';
import uPlot, { Axis } from 'uplot';

import { uPlotXAxisValuesFormat } from '../../uPlotLib/utils/constants';
import getGridColor from '../../uPlotLib/utils/getGridColor';
import { buildYAxisSizeCalculator } from '../utils/axis';
import { AxisProps, ConfigBuilder } from './types';

const PANEL_TYPES_WITH_X_AXIS_DATETIME_FORMAT = [
	PANEL_TYPES.TIME_SERIES,
	PANEL_TYPES.BAR,
];

/**
 * Builder for uPlot axis configuration
 * Handles creation and merging of axis settings
 * Based on getAxes utility function patterns
 */
export class UPlotAxisBuilder extends ConfigBuilder<AxisProps, Axis> {
	/**
	 * Build grid configuration based on theme and scale type.
	 * Supports partial grid config: provided values override defaults.
	 */
	private buildGridConfig(): uPlot.Axis.Grid | undefined {
		const { grid, isDarkMode, isLogScale } = this.props;

		const defaultStroke = getGridColor(isDarkMode ?? false);
		const defaultWidth = isLogScale ? 0.1 : 0.2;
		const defaultShow = true;

		// Merge partial or full grid config with defaults
		if (grid) {
			return {
				stroke: grid.stroke ?? defaultStroke,
				width: grid.width ?? defaultWidth,
				show: grid.show ?? defaultShow,
			};
		}

		return {
			stroke: defaultStroke,
			width: defaultWidth,
			show: defaultShow,
		};
	}

	/**
	 * Build ticks configuration
	 */
	private buildTicksConfig(): uPlot.Axis.Ticks | undefined {
		const { ticks } = this.props;

		// If explicit ticks config provided, use it
		if (ticks) {
			return ticks;
		}

		// Build default ticks config
		return {
			width: 0.3,
			show: true,
		};
	}

	/**
	 * Build values formatter for X-axis (time)
	 */
	private buildXAxisValuesFormatter(): uPlot.Axis.Values | undefined {
		const { panelType } = this.props;

		if (
			panelType &&
			PANEL_TYPES_WITH_X_AXIS_DATETIME_FORMAT.includes(panelType)
		) {
			return uPlotXAxisValuesFormat as uPlot.Axis.Values;
		}

		return undefined;
	}

	/**
	 * Build values formatter for Y-axis (values with units)
	 */
	private buildYAxisValuesFormatter(): uPlot.Axis.Values {
		const { yAxisUnit, decimalPrecision } = this.props;

		return (_, t): string[] =>
			t.map((v) => {
				if (v === null || v === undefined || Number.isNaN(v)) {
					return '';
				}
				const value = getToolTipValue(v.toString(), yAxisUnit, decimalPrecision);
				return `${value}`;
			});
	}

	/**
	 * Build values formatter based on axis type and props
	 */
	private buildValuesFormatter(): uPlot.Axis.Values | undefined {
		const { values, scaleKey } = this.props;

		// If explicit values formatter provided, use it
		if (values) {
			return values;
		}

		// Route to appropriate formatter based on scale key
		return scaleKey === 'x'
			? this.buildXAxisValuesFormatter()
			: scaleKey === 'y'
			? this.buildYAxisValuesFormatter()
			: undefined;
	}

	/**
	 * Build dynamic size calculator for Y-axis
	 */
	private buildSizeCalculator(): uPlot.Axis.Size | undefined {
		const { size, scaleKey } = this.props;

		// If explicit size calculator provided, use it
		if (size) {
			return size;
		}

		// Y-axis needs dynamic sizing based on text width
		if (scaleKey === 'y') {
			return buildYAxisSizeCalculator(this.props.gap ?? 5);
		}

		return undefined;
	}

	/**
	 * Build stroke color based on props
	 */
	private buildStrokeColor(): string | undefined {
		const { stroke, isDarkMode } = this.props;

		if (stroke !== undefined) {
			return stroke;
		}

		if (isDarkMode !== undefined) {
			return isDarkMode ? 'white' : 'black';
		}

		return undefined;
	}

	getConfig(): Axis {
		const {
			scaleKey,
			label,
			show = true,
			side = 2, // bottom by default
			space,
			gap = 5, // default gap is 5
		} = this.props;

		const grid = this.buildGridConfig();
		const ticks = this.buildTicksConfig();
		const values = this.buildValuesFormatter();
		const size = this.buildSizeCalculator();
		const stroke = this.buildStrokeColor();

		const axisConfig: Axis = {
			scale: scaleKey,
			show,
			side,
		};

		// Add properties conditionally
		if (label) {
			axisConfig.label = label;
		}
		if (stroke) {
			axisConfig.stroke = stroke;
		}
		if (grid) {
			axisConfig.grid = grid;
		}
		if (ticks) {
			axisConfig.ticks = ticks;
		}
		if (values) {
			axisConfig.values = values;
		}
		if (gap !== undefined) {
			axisConfig.gap = gap;
		}
		if (space !== undefined) {
			axisConfig.space = space;
		}
		if (size) {
			axisConfig.size = size;
		}

		return axisConfig;
	}

	merge(props: Partial<AxisProps>): void {
		this.props = { ...this.props, ...props };
	}
}

export type { AxisProps };
