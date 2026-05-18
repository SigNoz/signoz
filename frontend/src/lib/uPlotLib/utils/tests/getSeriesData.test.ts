/* eslint-disable @typescript-eslint/explicit-function-return-type */
import getSeries from '../getSeriesData';
import {
	seriesBarChartData,
	seriesLineChartData,
} from './__mocks__/seriesData';

jest.mock('../getRenderer', () => jest.fn().mockImplementation(() => () => {}));

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
		// @ts-expect-error
		expect(seriesData[1].drawStyle).toBe('bars');
	});

	it('Should return seris drawline line chart for panel type time series', () => {
		const seriesData = getSeries(seriesLineChartData);
		// @ts-expect-error

		expect(seriesData[1].drawStyle).toBe('line');
	});
});
