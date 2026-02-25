import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';

import Highlights from '../Highlights';
import { formatTimestampToReadableDate } from '../utils';
import { getMockMetricHighlightsData, MOCK_METRIC_NAME } from './testUtlls';

const useGetMetricHighlightsMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricHighlights',
);

describe('Highlights', () => {
	beforeEach(() => {
		useGetMetricHighlightsMock.mockReturnValue(getMockMetricHighlightsData());
	});

	it('should render all highlights data correctly', () => {
		render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const dataPoints = screen.getByTestId('metric-highlights-data-points');
		const timeSeriesTotal = screen.getByTestId(
			'metric-highlights-time-series-total',
		);
		const lastReceived = screen.getByTestId('metric-highlights-last-received');

		expect(dataPoints.textContent).toBe('1M+');
		expect(timeSeriesTotal.textContent).toBe('1M total ⎯ 1M active');
		expect(lastReceived.textContent).toBe(
			formatTimestampToReadableDate('2026-01-24T00:00:00Z'),
		);
	});

	it('should render error state correctly', () => {
		useGetMetricHighlightsMock.mockReturnValue(
			getMockMetricHighlightsData(
				{},
				{
					isError: true,
				},
			),
		);

		render(<Highlights metricName={MOCK_METRIC_NAME} />);

		expect(
			screen.getByTestId('metric-highlights-error-state'),
		).toBeInTheDocument();
	});

	it('should render loading state when data is loading', () => {
		useGetMetricHighlightsMock.mockReturnValue(
			getMockMetricHighlightsData(
				{},
				{
					isLoading: true,
				},
			),
		);

		render(<Highlights metricName={MOCK_METRIC_NAME} />);

		expect(
			screen.getByTestId('metric-highlights-loading-state'),
		).toBeInTheDocument();
	});
});
