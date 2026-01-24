import { render } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';

import Highlights from '../Highlights';
import { getMockMetricHighlightsData } from './testUtlls';
import { formatTimestampToReadableDate } from '../utils';

const MOCK_METRIC_NAME = 'test-metric';
const METRIC_DETAILS_GRID_VALUE_SELECTOR = '.metric-details-grid-value';

const useGetMetricHighlightsMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricHighlights',
);

describe('Highlights', () => {
	beforeEach(() => {
		useGetMetricHighlightsMock.mockReturnValue(getMockMetricHighlightsData());
	});

	it('should render all highlights data correctly', () => {
		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);

		expect(metricHighlightsValues).toHaveLength(3);
		expect(metricHighlightsValues[0].textContent).toBe('1M+');
		expect(metricHighlightsValues[1].textContent).toBe('1M total ⎯ 1M active');
		expect(metricHighlightsValues[2].textContent).toBe(
			formatTimestampToReadableDate('2026-01-24T00:00:00Z'),
		);
	});

	it('should render "-" for highlights data when there is an error', () => {
		useGetMetricHighlightsMock.mockReturnValue(
			getMockMetricHighlightsData(
				{},
				{
					isError: true,
				},
			),
		);

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);
		expect(metricHighlightsValues[0].textContent).toBe('-');
		expect(metricHighlightsValues[1].textContent).toBe('-');
		expect(metricHighlightsValues[2].textContent).toBe('-');
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

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('should not render grid values when there is no data', () => {
		useGetMetricHighlightsMock.mockReturnValue(
			getMockMetricHighlightsData({
				data: undefined,
			}),
		);

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);
		expect(metricHighlightsValues).toHaveLength(0);
	});
});
