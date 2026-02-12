import { PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
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
export class UPlotSeriesBuilder extends ConfigBuilder<SeriesProps, Series> {
	private buildLineConfig({
		lineColor,
	}: {
		lineColor: string;
	}): Partial<Series> {
		const { lineWidth, lineStyle, lineCap } = this.props;
		const lineConfig: Partial<Series> = {
			stroke: lineColor,
			width: lineWidth ?? 2,
		};

		if (lineStyle === LineStyle.Dashed) {
			lineConfig.dash = [10, 10];
		}

		if (lineCap) {
			lineConfig.cap = lineCap;
		}

		if (this.props.panelType === PANEL_TYPES.BAR) {
			lineConfig.fill = lineColor;
		} else if (this.props.panelType === PANEL_TYPES.HISTOGRAM) {
			lineConfig.fill = `${lineColor}40`;
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
		lineColor,
	}: {
		lineColor: string;
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
			stroke: lineColor,
			fill: lineColor,
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

		const lineColor = this.getLineColor();

		const lineConfig = this.buildLineConfig({
			lineColor,
		});
		const pathConfig = this.buildPathConfig();
		const pointsConfig = this.buildPointsConfig({
			lineColor,
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

let builders: PathBuilders | null = null;

/**
 * Get path builder based on draw style and interpolation
 */
function getPathBuilder({
	drawStyle,
	lineInterpolation,
	barAlignment = BarAlignment.Center,
	barWidthFactor = 0.6,
	barMaxWidth = 200,
}: {
	drawStyle: DrawStyle;
	lineInterpolation?: LineInterpolation;
	barAlignment?: BarAlignment;
	barMaxWidth?: number;
	barWidthFactor?: number;
}): Series.PathBuilder {
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

	if (drawStyle === DrawStyle.Bar) {
		const barsCfgKey = `bars|${barAlignment}|${barWidthFactor}|${barMaxWidth}`;
		if (!builders[barsCfgKey] && pathBuilders.bars) {
			builders[barsCfgKey] = pathBuilders.bars({
				size: [barWidthFactor, barMaxWidth],
				align: barAlignment,
			});
		}
		return builders[barsCfgKey];
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

export type { SeriesProps };
