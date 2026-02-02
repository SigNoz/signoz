import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import uPlot, { Series } from 'uplot';

import {
	ConfigBuilder,
	DrawStyle,
	FillStyle,
	LineInterpolation,
	SeriesProps,
	VisibilityMode,
} from './types';

/**
 * Builder for uPlot series configuration
 * Handles creation of series settings
 */
export class UPlotSeriesBuilder extends ConfigBuilder<SeriesProps, Series> {
	private buildLineConfig(
		lineColor: string,
		lineWidth?: number,
		lineStyle?: { fill?: FillStyle; dash?: number[] },
	): Partial<Series> {
		const lineConfig: Partial<Series> = {
			stroke: lineColor,
			width: lineWidth ?? 2,
		};

		if (lineStyle && lineStyle.fill !== FillStyle.Solid) {
			if (lineStyle.fill === FillStyle.Dot) {
				lineConfig.cap = 'round';
			}
			lineConfig.dash = lineStyle.dash ?? [10, 10];
		}

		return lineConfig;
	}

	/**
	 * Build path configuration
	 */
	private buildPathConfig({
		pathBuilder,
		drawStyle,
		lineInterpolation,
	}: {
		pathBuilder?: Series.PathBuilder | null;
		drawStyle: DrawStyle;
		lineInterpolation?: LineInterpolation;
	}): Partial<Series> {
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
					const pathsBuilder = getPathBuilder(drawStyle, lineInterpolation);

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
		lineWidth,
		pointSize,
		pointsBuilder,
		pointsFilter,
		drawStyle,
		showPoints,
	}: {
		lineColor: string;
		lineWidth?: number;
		pointSize?: number;
		pointsBuilder: Series.Points.Show | null;
		pointsFilter: Series.Points.Filter | null;
		drawStyle: DrawStyle;
		showPoints?: VisibilityMode;
	}): Partial<Series.Points> {
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
		const {
			drawStyle,
			pathBuilder,
			pointsBuilder,
			pointsFilter,
			lineInterpolation,
			lineWidth,
			lineStyle,
			showPoints,
			pointSize,
			scaleKey,
			label,
			spanGaps,
			show = true,
		} = this.props;

		const lineColor = this.getLineColor();

		const lineConfig = this.buildLineConfig(lineColor, lineWidth, lineStyle);
		const pathConfig = this.buildPathConfig({
			pathBuilder,
			drawStyle,
			lineInterpolation,
		});
		const pointsConfig = this.buildPointsConfig({
			lineColor,
			lineWidth,
			pointSize,
			pointsBuilder: pointsBuilder ?? null,
			pointsFilter: pointsFilter ?? null,
			drawStyle,
			showPoints,
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
function getPathBuilder(
	style: DrawStyle,
	lineInterpolation?: LineInterpolation,
): Series.PathBuilder {
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

	if (style === DrawStyle.Line) {
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
