import { getUPlotChartData } from '../../../lib/uPlotLib/utils/getUplotChartData';
import {
	BarNonStackedChartData,
	BarStackedChartData,
	TimeSeriesChartData,
} from './__mocks__/uplotChartData';

describe('getUplotChartData', () => {
	it('should return the correct chart data for non-stacked bar chart', () => {
		const result = getUPlotChartData(
			BarNonStackedChartData.apiResponse,
			BarNonStackedChartData.fillSpans,
			BarNonStackedChartData.stackedBarChart,
		);
		expect(result).toEqual([
			[1758713940, 1758715020],
			[33.933, 31.767],
			[20.0, 25.0],
		]);
	});

	it('should return the correct chart data for stacked bar chart', () => {
		const result = getUPlotChartData(
			BarStackedChartData.apiResponse,
			BarStackedChartData.fillSpans,
			BarStackedChartData.stackedBarChart,
		);
		// For stacked charts, the values should be cumulative
		// First series: [33.933, 31.767] + [20.0, 25.0] = [53.933, 56.767]
		// Second series: [20.0, 25.0] (unchanged)
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual([1758713940, 1758715020]);
		expect(result[1][0]).toBeCloseTo(53.933, 3);
		expect(result[1][1]).toBeCloseTo(56.767, 3);
		expect(result[2]).toEqual([20.0, 25.0]);
	});

	it('should return the correct chart data for time series chart', () => {
		const result = getUPlotChartData(
			TimeSeriesChartData.apiResponse,
			TimeSeriesChartData.fillSpans,
			TimeSeriesChartData.stackedBarChart,
		);
		expect(result).toEqual([
			[1758713940, 1758715020],
			[33.933, 31.767],
			[20.0, 25.0],
		]);
	});
});
