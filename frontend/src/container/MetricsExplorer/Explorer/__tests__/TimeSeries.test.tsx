import { render, RenderResult, screen, waitFor } from '@testing-library/react';
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
): RenderResult {
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
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...overrides}
		/>,
	);
}

describe('TimeSeries', () => {
	beforeEach(() => {
		updateMetricMetadataSpy.mockReturnValue(({
			mutate: mockUpdateMetricMetadata,
			isLoading: false,
		} as Partial<UseUpdateMetricMetadataReturnType>) as UseUpdateMetricMetadataReturnType);
	});

	it('should render a warning icon when a metric has no unit among multiple metrics', () => {
		const user = userEvent.setup();
		const { container } = renderTimeSeries({
			metricUnits: ['', 'count'],
			metricNames: ['metric1', 'metric2'],
			metrics: [undefined, undefined],
		});

		const alertIcon = container.querySelector('.no-unit-warning') as HTMLElement;
		user.hover(alertIcon);
		waitFor(() =>
			expect(
				screen.findByText('This metric does not have a unit'),
			).toBeInTheDocument(),
		);
	});

	it('clicking on warning icon tooltip should open metric details modal', async () => {
		const user = userEvent.setup();
		const { container } = renderTimeSeries({
			metricUnits: ['', 'count'],
			metricNames: ['metric1', 'metric2'],
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
			yAxisUnit: 'seconds',
		});

		const alertIcon = container.querySelector('.no-unit-warning') as HTMLElement;
		user.hover(alertIcon);

		const metricDetailsLink = await screen.findByText('metric details');
		user.click(metricDetailsLink);

		waitFor(() =>
			expect(mockSetIsMetricDetailsOpen).toHaveBeenCalledWith('metric1'),
		);
	});

	it('shows Save unit button when metric had no unit but one is selected', async () => {
		const { findByText, getByRole } = renderTimeSeries({
			metricUnits: [undefined],
			metricNames: ['metric1'],
			metrics: [MOCK_METRIC_METADATA],
			yAxisUnit: 'seconds',
			showYAxisUnitSelector: true,
		});

		expect(
			await findByText('Save the selected unit for this metric?'),
		).toBeInTheDocument();

		const yesButton = getByRole('button', { name: 'Yes' });
		expect(yesButton).toBeInTheDocument();
		expect(yesButton).toBeEnabled();
	});

	it('clicking on save unit button shoould upated metric metadata', async () => {
		const user = userEvent.setup();
		const { getByRole } = renderTimeSeries({
			metricUnits: [''],
			metricNames: ['metric1'],
			metrics: [MOCK_METRIC_METADATA],
			yAxisUnit: 'seconds',
			showYAxisUnitSelector: true,
		});

		const yesButton = getByRole('button', { name: /Yes/i });
		await user.click(yesButton);

		expect(mockUpdateMetricMetadata).toHaveBeenCalledWith(
			{
				pathParams: {
					metricName: 'metric1',
				},
				data: expect.objectContaining({ unit: 'seconds' }),
			},
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});
});
