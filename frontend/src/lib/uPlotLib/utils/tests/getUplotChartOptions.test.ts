import { PANEL_TYPES } from 'constants/queryBuilder';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';

/* eslint-disable vitest/no-mocks-import -- ./__mocks__ holds fixture data imported directly, not automocks */
import {
	inputPropsTimeSeries,
	seriesDataBarChart,
	seriesDataTimeSeries,
} from './__mocks__/uplotChartOptionsData';

vi.mock('../../plugins/tooltipPlugin', () => ({
	default: vi.fn().mockReturnValue({}),
}));
vi.mock('../getSeriesData', () => ({
	default: vi.fn().mockImplementation((props) => {
		const { panelType } = props;

		if (panelType === PANEL_TYPES.TIME_SERIES) {
			return seriesDataTimeSeries;
		}
		return seriesDataBarChart;
	}),
}));

describe('getUPlotChartOptions', () => {
	it('should return uPlot options', () => {
		const options = getUPlotChartOptions(inputPropsTimeSeries);
		expect(options.legend?.isolate).toBe(true);
		expect(options.width).toBe(inputPropsTimeSeries.dimensions.width);
		expect(options.axes?.length).toBe(2);
		expect(options.series[1].label).toBe('A');
	});

	it('should return enhanced legend options when enabled', () => {
		const options = getUPlotChartOptions({
			...inputPropsTimeSeries,
			enhancedLegend: true,
			legendPosition: 'bottom' as any,
		});
		expect(options.legend?.isolate).toBe(true);
		expect(options.legend?.show).toBe(true);
		expect(options.hooks?.ready).toBeDefined();
		expect(Array.isArray(options.hooks?.ready)).toBe(true);
	});

	it('should adjust chart dimensions for right legend position', () => {
		const options = getUPlotChartOptions({
			...inputPropsTimeSeries,
			enhancedLegend: true,
			legendPosition: 'right' as any,
		});
		expect(options.legend?.isolate).toBe(true);
		expect(options.width).toBeLessThan(inputPropsTimeSeries.dimensions.width);
		expect(options.height).toBe(inputPropsTimeSeries.dimensions.height);
	});

	it('should adjust chart dimensions for bottom legend position', () => {
		const options = getUPlotChartOptions({
			...inputPropsTimeSeries,
			enhancedLegend: true,
			legendPosition: 'bottom' as any,
		});
		expect(options.legend?.isolate).toBe(true);
		expect(options.width).toBe(inputPropsTimeSeries.dimensions.width);
		expect(options.height).toBeLessThan(inputPropsTimeSeries.dimensions.height);
	});

	it('Should return line chart as drawStyle for time series', () => {
		const options = getUPlotChartOptions(inputPropsTimeSeries);
		// @ts-expect-error: drawStyle is a custom runtime prop, not part of uPlot.Series
		expect(options.series[1].drawStyle).toBe('line');
		// @ts-expect-error: lineInterpolation is a custom runtime prop, not part of uPlot.Series
		expect(options.series[1].lineInterpolation).toBe('spline');
		expect(options.series[1].show).toBe(true);
		expect(options.series[1].label).toBe('A');
		expect(options.series[1].stroke).toBe('#6495ED');
		expect(options.series[1].width).toBe(2);
		expect(options.series[1].spanGaps).toBe(true);
		expect(options.series[1].points?.size).toBe(5);
	});

	it('should return bar chart as drawStyle for panel type bar', () => {
		const options = getUPlotChartOptions({
			...inputPropsTimeSeries,
			panelType: PANEL_TYPES.BAR,
		});
		// @ts-expect-error: drawStyle is a custom runtime prop, not part of uPlot.Series
		expect(options.series[1].drawStyle).toBe('bars');
		// @ts-expect-error: lineInterpolation is a custom runtime prop, not part of uPlot.Series
		expect(options.series[1].lineInterpolation).toBeNull();
		expect(options.series[1].show).toBe(true);
		expect(options.series[1].label).toBe('A');
		expect(options.series[1].fill).toBe('#6495ED40');
		expect(options.series[1].stroke).toBe('#6495ED');
		expect(options.series[1].width).toBe(2);
		expect(options.series[1].spanGaps).toBe(true);
		expect(options.series[1].points?.size).toBe(5);
	});
});
