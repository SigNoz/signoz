import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { calculateWidthBasedOnStepInterval } from 'lib/uPlotV2/utils';
import uPlot, { Series } from 'uplot';

import { generateGradientFill } from '../utils/generateGradientFill';
import {
	BarAlignment,
	ConfigBuilder,
	DrawStyle,
	FillMode,
	LineInterpolation,
	LineStyle,
	SeriesProps,
} from './types';

/**
 * Builder for uPlot series configuration
 * Handles creation of series settings
 */

/**
 * Path builders are static and shared across all instances of UPlotSeriesBuilder
 */
let builders: PathBuilders | null = null;

const DEFAULT_LINE_WIDTH = 2;
export const POINT_SIZE_FACTOR = 2.5;
export class UPlotSeriesBuilder extends ConfigBuilder<SeriesProps, Series> {
	constructor(props: SeriesProps) {
		super(props);
		const pathBuilders = uPlot.paths;

		if (!builders) {
			const linearBuilder = pathBuilders.linear;
			const splineBuilder = pathBuilders.spline;
			const steppedBuilder = pathBuilders.stepped;

			if (!linearBuilder || !splineBuilder || !steppedBuilder) {
				throw new Error('Required uPlot path builders are not available');
			}
			builders = {
				linear: linearBuilder(),
				spline: splineBuilder(),
				stepBefore: steppedBuilder({ align: -1 }),
				stepAfter: steppedBuilder({ align: 1 }),
			};
		}
	}

	private buildLineConfig({
		resolvedLineColor,
	}: {
		resolvedLineColor: string;
	}): Partial<Series> {
		const { lineWidth, lineStyle, lineCap, fillColor, fillMode } = this.props;
		const lineConfig: Partial<Series> = {
			stroke: resolvedLineColor,
			width: lineWidth ?? DEFAULT_LINE_WIDTH,
		};

		if (lineStyle === LineStyle.Dashed) {
			lineConfig.dash = [10, 10];
		}

		if (lineCap) {
			lineConfig.cap = lineCap;
		}

		/**
		 * Configure area fill based on draw style and fill mode:
		 * - bar charts always use a solid fill with the series color
		 * - histogram uses the same color with a fixed alpha suffix for translucency
		 * - for other series, an explicit fillMode controls whether we use a solid fill
		 *   or a vertical gradient from the series color to transparent
		 */
		const finalFillColor = fillColor ?? resolvedLineColor;

		if (this.props.drawStyle === DrawStyle.Bar) {
			lineConfig.fill = finalFillColor;
		} else if (this.props.drawStyle === DrawStyle.Histogram) {
			lineConfig.fill = `${finalFillColor}40`;
		} else if (fillMode && fillMode !== FillMode.None) {
			if (fillMode === FillMode.Solid) {
				lineConfig.fill = finalFillColor;
			} else if (fillMode === FillMode.Gradient) {
				lineConfig.fill = (self: uPlot): CanvasGradient =>
					generateGradientFill(self, finalFillColor, 'rgba(0, 0, 0, 0)');
			}
		}

		return lineConfig;
	}

	/**
	 * Build path configuration
	 */
	private buildPathConfig(): Partial<Series> {
		const {
			pathBuilder,
			drawStyle,
			lineInterpolation,
			barAlignment,
			barMaxWidth,
			barWidthFactor,
			stepInterval,
		} = this.props;
		if (pathBuilder) {
			return { paths: pathBuilder };
		}

		if (drawStyle === DrawStyle.Points) {
			return { paths: (): null => null };
		}

		if (drawStyle !== null) {
			return {
				paths: (
					self: uPlot,
					seriesIdx: number,
					idx0: number,
					idx1: number,
				): Series.Paths | null => {
					const pathsBuilder = getPathBuilder({
						drawStyle,
						lineInterpolation,
						barAlignment,
						barMaxWidth,
						barWidthFactor,
						stepInterval,
					});

					return pathsBuilder(self, seriesIdx, idx0, idx1);
				},
			};
		}

		return {};
	}

	/**
	 * Build points configuration
	 */
	private buildPointsConfig({
		resolvedLineColor,
	}: {
		resolvedLineColor: string;
	}): Partial<Series.Points> {
		const {
			lineWidth,
			pointSize,
			pointsBuilder,
			pointsFilter,
			drawStyle,
			showPoints,
		} = this.props;

		/**
		 * If pointSize is not provided, use the lineWidth * POINT_SIZE_FACTOR
		 * to determine the point size.
		 * POINT_SIZE_FACTOR is 2, so the point size will be 2x the line width.
		 */
		const resolvedPointSize =
			pointSize ?? (lineWidth ?? DEFAULT_LINE_WIDTH) * POINT_SIZE_FACTOR;

		const pointsConfig: Partial<Series.Points> = {
			stroke: resolvedLineColor,
			fill: resolvedLineColor,
			size: resolvedPointSize,
			filter: pointsFilter || undefined,
		};

		if (pointsBuilder) {
			pointsConfig.show = pointsBuilder;
		} else if (drawStyle === DrawStyle.Points) {
			pointsConfig.show = true;
		} else {
			pointsConfig.show = !!showPoints;
		}

		return pointsConfig;
	}

	private getLineColor(): string {
		const { colorMapping, label, lineColor, isDarkMode } = this.props;
		if (!label) {
			return lineColor ?? (isDarkMode ? themeColors.white : themeColors.black);
		}
		return (
			lineColor ??
			colorMapping[label] ??
			generateColor(
				label,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			)
		);
	}

	getConfig(): Series {
		const { scaleKey, label, spanGaps, show = true } = this.props;

		const resolvedLineColor = this.getLineColor();

		const lineConfig = this.buildLineConfig({
			resolvedLineColor,
		});
		const pathConfig = this.buildPathConfig();
		const pointsConfig = this.buildPointsConfig({
			resolvedLineColor,
		});

		return {
			scale: scaleKey,
			label,
			spanGaps: typeof spanGaps === 'boolean' ? spanGaps : false,
			value: (): string => '',
			pxAlign: true,
			show,
			...lineConfig,
			...pathConfig,
			points: Object.keys(pointsConfig).length > 0 ? pointsConfig : undefined,
		};
	}
}

interface PathBuilders {
	linear: Series.PathBuilder;
	spline: Series.PathBuilder;
	stepBefore: Series.PathBuilder;
	stepAfter: Series.PathBuilder;
	[key: string]: Series.PathBuilder;
}

/**
 * Get path builder based on draw style and interpolation
 */
function getPathBuilder({
	drawStyle,
	lineInterpolation,
	barAlignment = BarAlignment.Center,
	barWidthFactor = 0.6,
	barMaxWidth = 200,
	stepInterval,
}: {
	drawStyle: DrawStyle;
	lineInterpolation?: LineInterpolation;
	barAlignment?: BarAlignment;
	barMaxWidth?: number;
	barWidthFactor?: number;
	stepInterval?: number;
}): Series.PathBuilder {
	if (!builders) {
		throw new Error('Required uPlot path builders are not available');
	}

	if (drawStyle === DrawStyle.Bar || drawStyle === DrawStyle.Histogram) {
		const pathBuilders = uPlot.paths;
		return getBarPathBuilder({
			pathBuilders,
			barAlignment,
			barWidthFactor,
			barMaxWidth,
			stepInterval,
		});
	}

	if (drawStyle === DrawStyle.Line) {
		if (lineInterpolation === LineInterpolation.StepBefore) {
			return builders.stepBefore;
		}
		if (lineInterpolation === LineInterpolation.StepAfter) {
			return builders.stepAfter;
		}
		if (lineInterpolation === LineInterpolation.Linear) {
			return builders.linear;
		}
	}

	return builders.spline;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function getBarPathBuilder({
	pathBuilders,
	barAlignment,
	barWidthFactor,
	barMaxWidth,
	stepInterval,
}: {
	pathBuilders: typeof uPlot.paths;
	barAlignment: BarAlignment;
	barWidthFactor: number;
	barMaxWidth: number;
	stepInterval?: number;
}): Series.PathBuilder {
	if (!builders) {
		throw new Error('Required uPlot path builders are not available');
	}

	const barsPathBuilderFactory = pathBuilders.bars;

	// When a stepInterval is provided (in seconds), cap the maximum bar width
	// so that a single bar never visually spans more than stepInterval worth
	// of time on the x-scale.
	if (
		typeof stepInterval === 'number' &&
		stepInterval > 0 &&
		barsPathBuilderFactory
	) {
		return (
			self: uPlot,
			seriesIdx: number,
			idx0: number,
			idx1: number,
		): Series.Paths | null => {
			let effectiveBarMaxWidth = barMaxWidth;
			const widthBasedOnStepInterval = calculateWidthBasedOnStepInterval({
				uPlotInstance: self,
				stepInterval,
			});

			if (widthBasedOnStepInterval > 0) {
				effectiveBarMaxWidth = Math.min(
					effectiveBarMaxWidth,
					widthBasedOnStepInterval,
				);
			}

			const barsCfgKey = `bars|${barAlignment}|${barWidthFactor}|${effectiveBarMaxWidth}`;
			if (builders && !builders[barsCfgKey]) {
				builders[barsCfgKey] = barsPathBuilderFactory({
					size: [barWidthFactor, effectiveBarMaxWidth],
					align: barAlignment,
				});
			}

			return builders && builders[barsCfgKey]
				? builders[barsCfgKey](self, seriesIdx, idx0, idx1)
				: null;
		};
	}

	const barsCfgKey = `bars|${barAlignment}|${barWidthFactor}|${barMaxWidth}`;
	if (!builders[barsCfgKey] && barsPathBuilderFactory) {
		builders[barsCfgKey] = barsPathBuilderFactory({
			size: [barWidthFactor, barMaxWidth],
			align: barAlignment,
		});
	}

	return builders[barsCfgKey];
}

export type { SeriesProps };
