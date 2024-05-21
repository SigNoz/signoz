/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';

import {
	inputPropsTimeSeries,
	seriesDataBarChart,
	seriesDataTimeSeries,
} from './__mocks__/uplotChartOptionsData';

jest.mock('../../plugins/tooltipPlugin', () => jest.fn().mockReturnValue({}));
jest.mock('../getSeriesData', () =>
	jest.fn().mockImplementation((props) => {
		const { panelType } = props;

		if (panelType === PANEL_TYPES.TIME_SERIES) {
			return seriesDataTimeSeries;
		}
		return seriesDataBarChart;
	}),
);

describe('getUPlotChartOptions', () => {
	test('should return uPlot options', () => {
		const options = getUPlotChartOptions(inputPropsTimeSeries);
		expect(options.legend?.isolate).toBe(true);
		expect(options.width).toBe(inputPropsTimeSeries.dimensions.width);
		expect(options.height).toBe(inputPropsTimeSeries.dimensions.height - 30);
		expect(options.axes?.length).toBe(2);
		expect(options.series[1].label).toBe('A');
	});

	test('Should return line chart as drawStyle for time series', () => {
		const options = getUPlotChartOptions(inputPropsTimeSeries);
		// @ts-ignore
		expect(options.series[1].drawStyle).toBe('line');
		// @ts-ignore
		expect(options.series[1].lineInterpolation).toBe('spline');
		// @ts-ignore
		expect(options.series[1].show).toBe(true);
		expect(options.series[1].label).toBe('A');
		expect(options.series[1].stroke).toBe('#6495ED');
		expect(options.series[1].width).toBe(2);
		expect(options.series[1].spanGaps).toBe(true);
		// @ts-ignore
		expect(options.series[1].points.size).toBe(5);
	});

	test('should return bar chart as drawStyle for panel type bar', () => {
		const options = getUPlotChartOptions({
			...inputPropsTimeSeries,
			panelType: PANEL_TYPES.BAR,
		});
		// @ts-ignore
		expect(options.series[1].drawStyle).toBe('bars');
		// @ts-ignore
		expect(options.series[1].lineInterpolation).toBe(null);
		// @ts-ignore
		expect(options.series[1].show).toBe(true);
		expect(options.series[1].label).toBe('A');
		expect(options.series[1].fill).toBe('#6495ED40');
		expect(options.series[1].stroke).toBe('#6495ED');
		expect(options.series[1].width).toBe(2);
		expect(options.series[1].spanGaps).toBe(true);
		// @ts-ignore
		expect(options.series[1].points.size).toBe(5);
	});
});
