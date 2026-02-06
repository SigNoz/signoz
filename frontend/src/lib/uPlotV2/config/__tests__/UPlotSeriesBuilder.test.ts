import { themeColors } from 'constants/theme';
import uPlot from 'uplot';

import type { SeriesProps } from '../types';
import {
	DrawStyle,
	LineInterpolation,
	LineStyle,
	VisibilityMode,
} from '../types';
import { UPlotSeriesBuilder } from '../UPlotSeriesBuilder';

const createBaseProps = (
	overrides: Partial<SeriesProps> = {},
): SeriesProps => ({
	scaleKey: 'y',
	label: 'Requests',
	colorMapping: {},
	drawStyle: DrawStyle.Line,
	isDarkMode: false,
	...overrides,
});

describe('UPlotSeriesBuilder', () => {
	it('maps basic props into uPlot series config', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				label: 'Latency',
				spanGaps: true,
				show: false,
			}),
		);

		const config = builder.getConfig();

		expect(config.scale).toBe('y');
		expect(config.label).toBe('Latency');
		expect(config.spanGaps).toBe(true);
		expect(config.show).toBe(false);
		expect(config.pxAlign).toBe(true);
		expect(typeof config.value).toBe('function');
	});

	it('uses explicit lineColor when provided, regardless of mapping', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				lineColor: '#ff00ff',
				colorMapping: { Requests: '#00ff00' },
			}),
		);

		const config = builder.getConfig();

		expect(config.stroke).toBe('#ff00ff');
	});

	it('falls back to theme colors when no label is provided', () => {
		const darkBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				label: undefined,
				isDarkMode: true,
				lineColor: undefined,
			}),
		);
		const lightBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				label: undefined,
				isDarkMode: false,
				lineColor: undefined,
			}),
		);

		const darkConfig = darkBuilder.getConfig();
		const lightConfig = lightBuilder.getConfig();

		expect(darkConfig.stroke).toBe(themeColors.white);
		expect(lightConfig.stroke).toBe(themeColors.black);
	});

	it('uses colorMapping when available and no explicit lineColor is provided', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				label: 'Requests',
				colorMapping: { Requests: '#123456' },
				lineColor: undefined,
			}),
		);

		const config = builder.getConfig();

		expect(config.stroke).toBe('#123456');
	});

	it('passes through a custom pathBuilder when provided', () => {
		const customPaths = (jest.fn() as unknown) as uPlot.Series.PathBuilder;

		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				pathBuilder: customPaths,
			}),
		);

		const config = builder.getConfig();

		expect(config.paths).toBe(customPaths);
	});

	it('disables line paths when drawStyle is Points, but still renders points', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Points,
				pointSize: 4,
				lineWidth: 2,
				lineColor: '#aa00aa',
			}),
		);

		const config = builder.getConfig();

		expect(typeof config.paths).toBe('function');
		expect(config.paths && config.paths({} as uPlot, 1, 0, 10)).toBeNull();

		expect(config.points).toBeDefined();
		expect(config.points?.stroke).toBe('#aa00aa');
		expect(config.points?.fill).toBe('#aa00aa');
		expect(config.points?.show).toBe(true);
		expect(config.points?.size).toBe(4);
	});

	it('derives point size based on lineWidth and pointSize', () => {
		const smallPointsBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				lineWidth: 4,
				pointSize: 2,
			}),
		);
		const largePointsBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				lineWidth: 2,
				pointSize: 4,
			}),
		);

		const smallConfig = smallPointsBuilder.getConfig();
		const largeConfig = largePointsBuilder.getConfig();

		expect(smallConfig.points?.size).toBeUndefined();
		expect(largeConfig.points?.size).toBe(4);
	});

	it('uses pointsBuilder when provided instead of default visibility logic', () => {
		const pointsBuilder: uPlot.Series.Points.Show = jest.fn(
			() => true,
		) as uPlot.Series.Points.Show;

		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				pointsBuilder,
				drawStyle: DrawStyle.Line,
			}),
		);

		const config = builder.getConfig();

		expect(config.points?.show).toBe(pointsBuilder);
	});

	it('respects VisibilityMode for point visibility when no custom pointsBuilder is given', () => {
		const neverPointsBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				showPoints: VisibilityMode.Never,
			}),
		);
		const alwaysPointsBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				showPoints: VisibilityMode.Always,
			}),
		);

		const neverConfig = neverPointsBuilder.getConfig();
		const alwaysConfig = alwaysPointsBuilder.getConfig();

		expect(neverConfig.points?.show).toBe(false);
		expect(alwaysConfig.points?.show).toBe(true);
	});

	it('applies LineStyle.Dashed and lineCap to line config', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				lineStyle: LineStyle.Dashed,
				lineCap: 'round' as CanvasLineCap,
			}),
		);

		const config = builder.getConfig();

		expect(config.dash).toEqual([10, 10]);
		expect(config.cap).toBe('round');
	});

	it('builds default paths for Line drawStyle and invokes the path builder', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				lineInterpolation: LineInterpolation.Linear,
			}),
		);

		const config = builder.getConfig();

		expect(typeof config.paths).toBe('function');
		const result = config.paths?.({} as uPlot, 1, 0, 10);
		expect(result).toBeDefined();
	});

	it('uses StepBefore and StepAfter interpolation for line paths', () => {
		const stepBeforeBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				lineInterpolation: LineInterpolation.StepBefore,
			}),
		);
		const stepAfterBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				lineInterpolation: LineInterpolation.StepAfter,
			}),
		);

		const stepBeforeConfig = stepBeforeBuilder.getConfig();
		const stepAfterConfig = stepAfterBuilder.getConfig();

		expect(typeof stepBeforeConfig.paths).toBe('function');
		expect(typeof stepAfterConfig.paths).toBe('function');
		expect(stepBeforeConfig.paths?.({} as uPlot, 1, 0, 5)).toBeDefined();
		expect(stepAfterConfig.paths?.({} as uPlot, 1, 0, 5)).toBeDefined();
	});

	it('defaults to spline interpolation when lineInterpolation is Spline or undefined', () => {
		const splineBuilder = new UPlotSeriesBuilder(
			createBaseProps({
				drawStyle: DrawStyle.Line,
				lineInterpolation: LineInterpolation.Spline,
			}),
		);
		const defaultBuilder = new UPlotSeriesBuilder(
			createBaseProps({ drawStyle: DrawStyle.Line }),
		);

		const splineConfig = splineBuilder.getConfig();
		const defaultConfig = defaultBuilder.getConfig();

		expect(typeof splineConfig.paths).toBe('function');
		expect(typeof defaultConfig.paths).toBe('function');
	});

	it('coerces non-boolean spanGaps to false', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({ spanGaps: undefined }),
		);

		const config = builder.getConfig();

		expect(config.spanGaps).toBe(false);
	});

	it('preserves spanGaps true when provided as boolean', () => {
		const builder = new UPlotSeriesBuilder(createBaseProps({ spanGaps: true }));

		const config = builder.getConfig();

		expect(config.spanGaps).toBe(true);
	});

	it('uses generateColor when label has no colorMapping and no lineColor', () => {
		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				label: 'CustomSeries',
				colorMapping: {},
				lineColor: undefined,
			}),
		);

		const config = builder.getConfig();

		expect(config.stroke).toBeDefined();
		expect(typeof config.stroke).toBe('string');
		expect((config.stroke as string).length).toBeGreaterThan(0);
	});

	it('passes through pointsFilter when provided', () => {
		const pointsFilter: uPlot.Series.Points.Filter = jest.fn(
			(_self, _seriesIdx, _show) => null,
		);

		const builder = new UPlotSeriesBuilder(
			createBaseProps({
				pointsFilter,
				drawStyle: DrawStyle.Line,
			}),
		);

		const config = builder.getConfig();

		expect(config.points?.filter).toBe(pointsFilter);
	});
});
