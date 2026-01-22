import { render } from '@testing-library/react';
import { formatNumberIntoHumanReadableFormat } from 'container/MetricsExplorer/Summary/utils';
import * as useGetMetricHighlightsHooks from 'hooks/metricsExplorer/v2/useGetMetricHighlights';
import { UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { GetMetricHighlightsResponse } from 'types/api/metricsExplorer/v2';

import Highlights from '../Highlights';
import {
	formatNumberToCompactFormat,
	formatTimestampToReadableDate,
} from '../utils';
import { getMockMetricHighlightsData } from './testUtlls';

const MOCK_METRIC_NAME = 'test-metric';
const METRIC_DETAILS_GRID_VALUE_SELECTOR = '.metric-details-grid-value';

type UseGetMetricHighlightsResult = UseQueryResult<
	SuccessResponseV2<GetMetricHighlightsResponse>,
	Error
>;
const useGetMetricHighlightsMock = jest.spyOn(
	useGetMetricHighlightsHooks,
	'useGetMetricHighlights',
);
const mockMetricHighlightsData = getMockMetricHighlightsData();

describe('Highlights', () => {
	beforeEach(() => {
		useGetMetricHighlightsMock.mockReturnValue(({
			data: mockMetricHighlightsData,
		} as Partial<UseGetMetricHighlightsResult>) as UseGetMetricHighlightsResult);
	});

	it('should render all highlights data correctly', () => {
		const {
			dataPoints,
			activeTimeSeries,
			totalTimeSeries,
			lastReceived,
		} = mockMetricHighlightsData.data.data;

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);

		expect(metricHighlightsValues).toHaveLength(3);
		expect(metricHighlightsValues[0].textContent).toBe(
			formatNumberIntoHumanReadableFormat(dataPoints),
		);
		expect(metricHighlightsValues[1].textContent).toBe(
			`${formatNumberToCompactFormat(
				totalTimeSeries,
			)} total ⎯ ${formatNumberToCompactFormat(activeTimeSeries)} active`,
		);
		expect(metricHighlightsValues[2].textContent).toBe(
			formatTimestampToReadableDate(lastReceived),
		);
	});

	it('should render "-" for highlights data when there is an error', () => {
		useGetMetricHighlightsMock.mockReturnValue(({
			isError: true,
			data: getMockMetricHighlightsData(),
		} as Partial<UseGetMetricHighlightsResult>) as UseGetMetricHighlightsResult);

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);
		expect(metricHighlightsValues[0].textContent).toBe('-');
		expect(metricHighlightsValues[1].textContent).toBe('-');
		expect(metricHighlightsValues[2].textContent).toBe('-');
	});

	it('should render loading state when data is loading', () => {
		useGetMetricHighlightsMock.mockReturnValue(({
			isLoading: true,
		} as Partial<UseGetMetricHighlightsResult>) as UseGetMetricHighlightsResult);

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('should not render grid values when there is no data', () => {
		useGetMetricHighlightsMock.mockReturnValue(({
			data: undefined,
		} as Partial<UseGetMetricHighlightsResult>) as UseGetMetricHighlightsResult);

		const { container } = render(<Highlights metricName={MOCK_METRIC_NAME} />);

		const metricHighlightsValues = container.querySelectorAll(
			METRIC_DETAILS_GRID_VALUE_SELECTOR,
		);
		expect(metricHighlightsValues).toHaveLength(0);
	});
});
