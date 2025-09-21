/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import getSeries from '../getSeriesData';
import {
	seriesBarChartData,
	seriesLineChartData,
} from './__mocks__/seriesData';

jest.mock('../getRenderer', () => jest.fn().mockImplementation(() => () => {}));

describe('Get Series Data', () => {
	test('Should return series data for uplot chart', () => {
		const seriesData = getSeries(seriesBarChartData);
		expect(seriesData.length).toBe(5);
		expect(seriesData[1].label).toBe('firstLegend');
		expect(seriesData[1].show).toBe(true);
		expect(seriesData[1].fill).toBe('#C7158540');
		expect(seriesData[1].width).toBe(2);
	});

	test('Should return series drawline bar chart for panel type barchart', () => {
		const seriesData = getSeries(seriesBarChartData);
		// @ts-ignore
		expect(seriesData[1].drawStyle).toBe('bars');
	});

	test('Should return seris drawline line chart for panel type time series', () => {
		const seriesData = getSeries(seriesLineChartData);
		// @ts-ignore

		expect(seriesData[1].drawStyle).toBe('line');
	});
});
