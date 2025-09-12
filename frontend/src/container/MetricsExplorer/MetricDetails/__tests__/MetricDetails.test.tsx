import { fireEvent, render, screen } from '@testing-library/react';
import { MetricDetails as MetricDetailsType } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import ROUTES from 'constants/routes';
import * as useGetMetricDetails from 'hooks/metricsExplorer/useGetMetricDetails';
import * as useUpdateMetricMetadata from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';

import MetricDetails from '../MetricDetails';

const mockMetricName = 'test-metric';
const mockMetricDescription = 'description for a test metric';
const mockMetricData: MetricDetailsType = {
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

const mockHandleExplorerTabChange = jest.fn();
jest
	.spyOn(useHandleExplorerTabChange, 'useHandleExplorerTabChange')
	.mockReturnValue({
		handleExplorerTabChange: mockHandleExplorerTabChange,
	});

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
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: (): { invalidateQueries: () => void } => ({
		invalidateQueries: jest.fn(),
	}),
}));

describe('MetricDetails', () => {
	it('renders metric details correctly', () => {
		render(
			<MetricDetails
				onClose={mockOnClose}
				isOpen
				isModalTimeSelection
				metricName={mockMetricName}
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByText(mockMetricName)).toBeInTheDocument();
		expect(screen.getByText(mockMetricDescription)).toBeInTheDocument();
		expect(
			screen.getByText(getUniversalNameFromMetricUnit(mockMetricData.unit)),
		).toBeInTheDocument();
	});

	it('renders the "open in explorer" and "inspect" buttons', () => {
		jest.spyOn(useGetMetricDetails, 'useGetMetricDetails').mockReturnValueOnce({
			...mockUseGetMetricDetailsData,
			data: {
				payload: {
					data: {
						...mockMetricData,
						metadata: {
							...mockMetricData.metadata,
							metric_type: MetricType.GAUGE,
						},
					},
				},
			},
		} as any);
		render(
			<MetricDetails
				onClose={mockOnClose}
				isOpen
				metricName={mockMetricName}
				isModalTimeSelection
				openInspectModal={mockOpenInspectModal}
			/>,
		);

		expect(screen.getByTestId('open-in-explorer-button')).toBeInTheDocument();
		expect(screen.getByTestId('inspect-metric-button')).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('open-in-explorer-button'));
		expect(mockHandleExplorerTabChange).toHaveBeenCalled();

		fireEvent.click(screen.getByTestId('inspect-metric-button'));
		expect(mockOpenInspectModal).toHaveBeenCalled();
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
			<MetricDetails
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
			<MetricDetails
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
			<MetricDetails
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
			<MetricDetails
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
