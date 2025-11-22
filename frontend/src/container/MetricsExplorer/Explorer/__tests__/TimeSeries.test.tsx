import {
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import { MetricDetails } from 'api/metricsExplorer/getMetricDetails';
import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import TimeSeries from '../TimeSeries';
import { TimeSeriesProps } from '../types';

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

const mockMetric: MetricDetails = {
	name: 'metric1',
	description: 'metric1 description',
	type: 'metric1 type',
	unit: 'metric1 unit',
	timeseries: 1,
	samples: 1,
	timeSeriesTotal: 1,
	timeSeriesActive: 1,
	lastReceived: '2021-01-01',
	attributes: [],
	alerts: null,
	dashboards: null,
};

const queryClient = new QueryClient();

const mockSetWarning = jest.fn();
const mockSetIsMetricDetailsOpen = jest.fn();
const mockSetYAxisUnit = jest.fn();

function renderTimeSeries(
	overrides: Partial<TimeSeriesProps> = {},
): RenderResult {
	return render(
		<QueryClientProvider client={queryClient}>
			<TimeSeries
				showOneChartPerQuery={false}
				setWarning={mockSetWarning}
				areAllMetricUnitsSame={false}
				isMetricUnitsLoading={false}
				metricUnits={[]}
				metricNames={[]}
				metrics={[]}
				isMetricUnitsError={false}
				setIsMetricDetailsOpen={mockSetIsMetricDetailsOpen}
				yAxisUnit="count"
				setYAxisUnit={mockSetYAxisUnit}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...overrides}
			/>
		</QueryClientProvider>,
	);
}

describe('TimeSeries', () => {
	it('should render a warning icon when a metric has no unit among multiple metrics', () => {
		const { container } = renderTimeSeries({
			metricUnits: ['', 'count'],
			metricNames: ['metric1', 'metric2'],
			metrics: [undefined, undefined],
		});

		// assert via tooltip text (appears on hover)
		const alertIcon = container.querySelector('.no-unit-warning') as HTMLElement;
		fireEvent.mouseOver(alertIcon);
		return waitFor(() =>
			expect(
				screen.getByText(/This metric does not have a unit/i),
			).toBeInTheDocument(),
		);
	});

	it('shows Save unit button when metric had no unit but one is selected', () => {
		const { getByText, getByRole } = renderTimeSeries({
			metricUnits: [''],
			metricNames: ['metric1'],
			metrics: [mockMetric],
			yAxisUnit: 'seconds',
		});

		expect(
			getByText(/Save the selected unit for this metric\?/i),
		).toBeInTheDocument();

		const yesButton = getByRole('button', { name: /Yes/i });
		expect(yesButton).toBeInTheDocument();
		expect(yesButton).toBeEnabled();
	});
});
