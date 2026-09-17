/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable vitest/no-mocks-import -- ./__mocks__ holds fixture data imported directly, not automocks */
import getSeries from '../getSeriesData';
import {
	seriesBarChartData,
	seriesLineChartData,
} from './__mocks__/seriesData';

vi.mock('../getRenderer', () => ({
	default: vi.fn().mockImplementation(() => () => {}),
}));

describe('Get Series Data', () => {
	it('Should return series data for uplot chart', () => {
		const seriesData = getSeries(seriesBarChartData);
		expect(seriesData).toHaveLength(5);
		expect(seriesData[1].label).toBe('firstLegend');
		expect(seriesData[1].show).toBe(true);
		expect(seriesData[1].fill).toBe('#FF6F91');
		expect(seriesData[1].width).toBe(2);
	});

	it('Should return series drawline bar chart for panel type barchart', () => {
		const seriesData = getSeries(seriesBarChartData);
		// @ts-expect-error: drawStyle is a custom runtime prop, not part of uPlot.Series
		expect(seriesData[1].drawStyle).toBe('bars');
	});

	it('Should return seris drawline line chart for panel type time series', () => {
		const seriesData = getSeries(seriesLineChartData);
		// @ts-expect-error: drawStyle is a custom runtime prop, not part of uPlot.Series

		expect(seriesData[1].drawStyle).toBe('line');
	});
});
