import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { calculateWidthBasedOnStepInterval } from 'lib/uPlotV2/utils';
import uPlot, { Series } from 'uplot';

import {
	BarAlignment,
	ConfigBuilder,
	DrawStyle,
	LineInterpolation,
	LineStyle,
	SeriesProps,
	VisibilityMode,
} from './types';

/**
 * Builder for uPlot series configuration
 * Handles creation of series settings
 */

/**
 * Path builders are static and shared across all instances of UPlotSeriesBuilder
 */
let builders: PathBuilders | null = null;
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
		const { lineWidth, lineStyle, lineCap, fillColor } = this.props;
		const lineConfig: Partial<Series> = {
			stroke: resolvedLineColor,
			width: lineWidth ?? 2,
		};

		if (lineStyle === LineStyle.Dashed) {
			lineConfig.dash = [10, 10];
		}

		if (lineCap) {
			lineConfig.cap = lineCap;
		}

		if (fillColor) {
			lineConfig.fill = fillColor;
		} else if (this.props.panelType === PANEL_TYPES.BAR) {
			lineConfig.fill = resolvedLineColor;
		} else if (this.props.panelType === PANEL_TYPES.HISTOGRAM) {
			lineConfig.fill = `${resolvedLineColor}40`;
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
		const pointsConfig: Partial<Series.Points> = {
			stroke: resolvedLineColor,
			fill: resolvedLineColor,
			size: !pointSize || pointSize < (lineWidth ?? 2) ? undefined : pointSize,
			filter: pointsFilter || undefined,
		};

		if (pointsBuilder) {
			pointsConfig.show = pointsBuilder;
		} else if (drawStyle === DrawStyle.Points) {
			pointsConfig.show = true;
		} else if (showPoints === VisibilityMode.Never) {
			pointsConfig.show = false;
		} else if (showPoints === VisibilityMode.Always) {
			pointsConfig.show = true;
		} else {
			pointsConfig.show = false; // default to hidden
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

	if (drawStyle === DrawStyle.Bar) {
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
