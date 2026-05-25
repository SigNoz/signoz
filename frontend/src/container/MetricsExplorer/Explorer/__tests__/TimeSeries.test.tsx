import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as metricsExplorerHooks from 'api/generated/services/metrics';

import TimeSeries from '../TimeSeries';
import { TimeSeriesProps } from '../types';
import { MOCK_METRIC_METADATA } from './testUtils';

const mockUpdateMetricMetadata = jest.fn();
const updateMetricMetadataSpy = jest.spyOn(
	metricsExplorerHooks,
	'useUpdateMetricMetadata',
);
type UseUpdateMetricMetadataReturnType = ReturnType<
	typeof metricsExplorerHooks.useUpdateMetricMetadata
>;

jest.mock('container/TimeSeriesView/TimeSeriesView', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue(
		<div role="img" aria-label="warning">
			TimeSeriesView
		</div>,
	),
}));

jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: jest.fn().mockReturnValue({
		invalidateQueries: jest.fn(),
	}),
	useQueries: jest.fn().mockImplementation((queries: any[]) =>
		queries.map(() => ({
			data: undefined,
			isLoading: false,
			isError: false,
			error: undefined,
		})),
	),
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn().mockReturnValue({
		globalTime: {
			selectedTime: '5min',
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));

const mockSetWarning = jest.fn();
const mockSetIsMetricDetailsOpen = jest.fn();
const mockSetYAxisUnit = jest.fn();

function renderTimeSeries(
	overrides: Partial<TimeSeriesProps> = {},
): ReturnType<typeof render> {
	return render(
		<TimeSeries
			showOneChartPerQuery={false}
			setWarning={mockSetWarning}
			areAllMetricUnitsSame={false}
			isMetricUnitsLoading={false}
			metricUnits={[]}
			metricNames={[]}
			metrics={[]}
			isMetricUnitsError={false}
			handleOpenMetricDetails={mockSetIsMetricDetailsOpen}
			yAxisUnit="count"
			setYAxisUnit={mockSetYAxisUnit}
			showYAxisUnitSelector={false}
			{...overrides}
		/>,
	);
}

describe('TimeSeries', () => {
	beforeEach(() => {
		updateMetricMetadataSpy.mockReturnValue({
			mutate: mockUpdateMetricMetadata,
			isLoading: false,
		} as Partial<UseUpdateMetricMetadataReturnType> as UseUpdateMetricMetadataReturnType);
	});

	it('shows select metric message when no metric is selected', () => {
		renderTimeSeries({ metricNames: [] });

		expect(
			screen.getByText('Select a metric and run a query to see the results'),
		).toBeInTheDocument();
		expect(screen.queryByText('TimeSeriesView')).not.toBeInTheDocument();
	});

	it('renders chart view when a metric is selected', () => {
		renderTimeSeries({
			metricNames: ['metric1'],
			metricUnits: ['count'],
			metrics: [MOCK_METRIC_METADATA],
		});

		expect(screen.getByText('TimeSeriesView')).toBeInTheDocument();
		expect(
			screen.queryByText('Select a metric and run a query to see the results'),
		).not.toBeInTheDocument();
	});

	it('should render a warning icon when a metric has no unit among multiple metrics', () => {
		renderTimeSeries({
			metricUnits: ['', 'count'],
			metricNames: ['metric1', 'metric2'],
			metrics: [undefined, undefined],
		});

		expect(
			screen.getByRole('img', { name: 'no unit warning' }),
		).toBeInTheDocument();
	});

	it('warning tooltip shows metric details link', async () => {
		const user = userEvent.setup();
		renderTimeSeries({
			metricUnits: ['', 'count'],
			metricNames: ['metric1', 'metric2'],
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
			yAxisUnit: 'seconds',
		});

		const alertIcon = screen.getByRole('img', { name: 'no unit warning' });
		await user.hover(alertIcon);

		await expect(
			screen.findByText('metric details'),
		).resolves.toBeInTheDocument();
	});

	it('shows save unit prompt with enabled button when metric has no unit and a unit is selected', async () => {
		renderTimeSeries({
			metricUnits: [undefined],
			metricNames: ['metric1'],
			metrics: [MOCK_METRIC_METADATA],
			yAxisUnit: 'seconds',
			showYAxisUnitSelector: true,
		});

		await expect(
			screen.findByText('Set the selected unit as the metric unit?'),
		).resolves.toBeInTheDocument();

		const yesButton = screen.getByRole('button', { name: 'Yes' });
		expect(yesButton).toBeEnabled();
	});
});
