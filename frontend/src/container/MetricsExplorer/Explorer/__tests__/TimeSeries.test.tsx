import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { UpdateMetricMetadataResponse } from 'api/metricsExplorer/updateMetricMetadata';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as useUpdateMetricMetadataHooks from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import { UseUpdateMetricMetadataProps } from 'hooks/metricsExplorer/useUpdateMetricMetadata';
import { UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { MetricMetadata } from 'types/api/metricsExplorer/v2/getMetricMetadata';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import TimeSeries from '../TimeSeries';
import { TimeSeriesProps } from '../types';

type MockUpdateMetricMetadata = UseMutationResult<
	SuccessResponse<UpdateMetricMetadataResponse> | ErrorResponse,
	Error,
	UseUpdateMetricMetadataProps
>;
const mockUpdateMetricMetadata = jest.fn();
jest
	.spyOn(useUpdateMetricMetadataHooks, 'useUpdateMetricMetadata')
	.mockReturnValue(({
		mutate: mockUpdateMetricMetadata,
		isLoading: false,
	} as Partial<MockUpdateMetricMetadata>) as MockUpdateMetricMetadata);

jest.mock('hooks/queryBuilder/useQueryBuilder', () => {
	const base = initialQueriesMap.metrics;
	const query: Query = {
		...base,
		builder: {
			...base.builder,
			queryData: [...base.builder.queryData, { ...base.builder.queryData[0] }],
		},
	};
	return {
		useQueryBuilder: (): { stagedQuery: Query; currentQuery: Query } => ({
			stagedQuery: query,
			currentQuery: query,
		}),
	};
});

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

const mockMetric: MetricMetadata = {
	type: MetricType.SUM,
	description: 'metric1 description',
	unit: 'metric1 unit',
	temporality: Temporality.CUMULATIVE,
	isMonotonic: true,
};

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
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...overrides}
		/>,
	);
}

describe('TimeSeries', () => {
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
			metrics: [mockMetric, mockMetric],
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

	it.skip('shows Save unit button when metric had no unit but one is selected', () => {
		const { findByText, getByRole } = renderTimeSeries({
			metricUnits: [undefined],
			metricNames: ['metric1'],
			metrics: [mockMetric],
			yAxisUnit: 'seconds',
		});

		expect(
			findByText('Save the selected unit for this metric?'),
		).toBeInTheDocument();

		const yesButton = getByRole('button', { name: 'Yes' });
		expect(yesButton).toBeInTheDocument();
		expect(yesButton).toBeEnabled();
	});

	it.skip('clicking on save unit button shoould upated metric metadata', () => {
		const user = userEvent.setup();
		const { getByRole } = renderTimeSeries({
			metricUnits: [''],
			metricNames: ['metric1'],
			metrics: [mockMetric],
			yAxisUnit: 'seconds',
		});

		const yesButton = getByRole('button', { name: /Yes/i });
		user.click(yesButton);

		expect(mockUpdateMetricMetadata).toHaveBeenCalledWith(
			{
				metricName: 'metric1',
				payload: expect.objectContaining({ unit: 'seconds' }),
			},
			expect.objectContaining({
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});
});
