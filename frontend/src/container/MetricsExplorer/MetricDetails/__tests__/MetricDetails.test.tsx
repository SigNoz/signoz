import { render, screen } from '@testing-library/react';
import { MetricDetails } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import ROUTES from 'constants/routes';
import * as useGetMetricDetails from 'hooks/metricsExplorer/useGetMetricDetails';
import * as useUpdateMetricMetadata from 'hooks/metricsExplorer/useUpdateMetricMetadata';

import MetricDetailsView from '../MetricDetails';

const mockMetricName = 'test-metric';
const mockMetricDescription = 'description for a test metric';
const mockMetricData: MetricDetails = {
	name: mockMetricName,
	description: mockMetricDescription,
	unit: 'count',
	attributes: [
		{
			key: 'test-attribute',
			value: ['test-value'],
			valueCount: 1,
		},
	],
	alerts: [],
	dashboards: [],
	metadata: {
		metric_type: MetricType.SUM,
		description: mockMetricDescription,
		unit: 'count',
	},
	type: '',
	timeseries: 0,
	samples: 0,
	timeSeriesTotal: 0,
	timeSeriesActive: 0,
	lastReceived: '',
};
const mockOpenInspectModal = jest.fn();
const mockOnClose = jest.fn();

const mockUseGetMetricDetailsData = {
	data: {
		payload: {
			data: mockMetricData,
		},
	},
	isLoading: false,
	isFetching: false,
	isError: false,
	error: null,
	refetch: jest.fn(),
};

jest
	.spyOn(useGetMetricDetails, 'useGetMetricDetails')
	.mockReturnValue(mockUseGetMetricDetailsData as any);

jest.spyOn(useUpdateMetricMetadata, 'useUpdateMetricMetadata').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
	isError: false,
	error: null,
} as any);

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER}`,
	}),
}));
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('MetricDetails', () => {
	it('renders metric details correctly', () => {
		render(
			<MetricDetailsView
				onClose={mockOnClose}
				isOpen
				isModalTimeSelection
				metricName={mockMetricName}
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByText(mockMetricName)).toBeInTheDocument();
		expect(screen.getByText(mockMetricDescription)).toBeInTheDocument();
		expect(screen.getByText(`${mockMetricData.unit}`)).toBeInTheDocument();
	});

	it('should render error state when metric details are not found', () => {
		jest.spyOn(useGetMetricDetails, 'useGetMetricDetails').mockReturnValue({
			...mockUseGetMetricDetailsData,
			isError: true,
			error: {
				message: 'Error fetching metric details',
			},
		} as any);

		render(
			<MetricDetailsView
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByText('Error fetching metric details')).toBeInTheDocument();
	});

	it('should render loading state when metric details are loading', () => {
		jest.spyOn(useGetMetricDetails, 'useGetMetricDetails').mockReturnValue({
			...mockUseGetMetricDetailsData,
			isLoading: true,
		} as any);

		render(
			<MetricDetailsView
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByTestId('metric-details-skeleton')).toBeInTheDocument();
	});

	it('should render all attributes section', () => {
		jest
			.spyOn(useGetMetricDetails, 'useGetMetricDetails')
			.mockReturnValue(mockUseGetMetricDetailsData as any);
		render(
			<MetricDetailsView
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
	});

	it('should not render all attributes section when relevant data is not present', () => {
		jest.spyOn(useGetMetricDetails, 'useGetMetricDetails').mockReturnValue({
			...mockUseGetMetricDetailsData,
			data: {
				payload: {
					data: {
						...mockMetricData,
						attributes: null,
					},
				},
			},
		} as any);
		render(
			<MetricDetailsView
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.queryByText('All Attributes')).not.toBeInTheDocument();
	});
});
