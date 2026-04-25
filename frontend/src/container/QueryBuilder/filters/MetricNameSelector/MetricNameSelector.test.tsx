import { useEffect, useState } from 'react';
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import {
	MetricsexplorertypesListMetricDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import { MetricNameSelector } from './MetricNameSelector';

const mockUseListMetrics = jest.fn();
jest.mock('api/generated/services/metrics', () => ({
	useListMetrics: (...args: unknown[]): ReturnType<typeof mockUseListMetrics> =>
		mockUseListMetrics(...args),
}));

jest.mock('hooks/useDebounce', () => ({
	__esModule: true,
	default: <T,>(value: T): T => value,
}));

jest.mock('../QueryBuilderSearch/OptionRenderer', () => ({
	__esModule: true,
	default: ({ value }: { value: string }): JSX.Element => <span>{value}</span>,
}));

// Ref lets StatefulMetricQueryHarness wire handleSetQueryData to real state,
// while other tests keep the default no-op mock.
const handleSetQueryDataRef: {
	current: (index: number, query: IBuilderQuery) => void;
} = {
	current: jest.fn(),
};

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): Record<string, unknown> => ({
		handleSetQueryData: (index: number, query: IBuilderQuery): void =>
			handleSetQueryDataRef.current(index, query),
		handleSetTraceOperatorData: jest.fn(),
		handleSetFormulaData: jest.fn(),
		removeQueryBuilderEntityByIndex: jest.fn(),
		panelType: 'TIME_SERIES',
		initialDataSource: DataSource.METRICS,
		currentQuery: {
			builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			queryType: 'builder',
		},
		setLastUsedQuery: jest.fn(),
		redirectWithQueryBuilderData: jest.fn(),
	}),
}));

function makeMetric(
	overrides: Partial<MetricsexplorertypesListMetricDTO> = {},
): MetricsexplorertypesListMetricDTO {
	return {
		metricName: 'http_requests_total',
		type: MetrictypesTypeDTO.sum,
		isMonotonic: true,
		description: '',
		temporality: 'cumulative' as never,
		unit: '',
		...overrides,
	};
}

function makeQuery(overrides: Partial<IBuilderQuery> = {}): IBuilderQuery {
	return {
		dataSource: DataSource.METRICS,
		queryName: 'A',
		aggregateOperator: 'count',
		aggregateAttribute: { key: '', type: '', dataType: DataTypes.Float64 },
		timeAggregation: 'avg',
		spaceAggregation: 'sum',
		filter: { expression: '' },
		aggregations: [],
		functions: [],
		filters: { items: [], op: 'AND' },
		expression: 'A',
		disabled: false,
		stepInterval: null,
		having: [],
		limit: null,
		orderBy: [],
		groupBy: [],
		legend: '',
		reduceTo: ReduceOperators.AVG,
		...overrides,
	} as IBuilderQuery;
}

function returnMetrics(
	metrics: MetricsexplorertypesListMetricDTO[],
	overrides: Record<string, unknown> = {},
): void {
	mockUseListMetrics.mockReturnValue({
		isFetching: false,
		isError: false,
		data: { data: { metrics } },
		queryKey: ['/api/v2/metrics'],
		...overrides,
	});
}

// snippet so tests can assert on them.
function MetricQueryHarness({ query }: { query: IBuilderQuery }): JSX.Element {
	const { handleChangeAggregatorAttribute, operators, spaceAggregationOptions } =
		useQueryOperations({
			query,
			index: 0,
			entityVersion: ENTITY_VERSION_V5,
		});

	return (
		<div>
			<MetricNameSelector
				query={query}
				onChange={handleChangeAggregatorAttribute}
			/>
			<ul data-testid="time-agg-options">
				{operators.map((op) => (
					<li key={op.value}>{op.label}</li>
				))}
			</ul>
			<ul data-testid="space-agg-options">
				{spaceAggregationOptions.map((op) => (
					<li key={op.value}>{op.label}</li>
				))}
			</ul>
		</div>
	);
}

function getOptionLabels(testId: string): string[] {
	const list = screen.getByTestId(testId);
	const items = within(list).queryAllByRole('listitem');
	return items.map((el) => el.textContent || '');
}

describe('MetricNameSelector', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('shows metric names from API as dropdown options', () => {
		returnMetrics([
			makeMetric({ metricName: 'http_requests_total' }),
			makeMetric({
				metricName: 'cpu_usage_percent',
				type: MetrictypesTypeDTO.gauge,
			}),
		]);

		render(<MetricNameSelector query={makeQuery()} onChange={jest.fn()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'h' } });

		expect(
			screen.getAllByText('http_requests_total').length,
		).toBeGreaterThanOrEqual(1);
		expect(
			screen.getAllByText('cpu_usage_percent').length,
		).toBeGreaterThanOrEqual(1);
	});

	it('retains typed metric name in input after blur', () => {
		returnMetrics([makeMetric({ metricName: 'http_requests_total' })]);

		render(<MetricNameSelector query={makeQuery()} onChange={jest.fn()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'http_requests_total' } });
		fireEvent.blur(input);

		expect(input).toHaveValue('http_requests_total');
	});

	it('shows error message when API request fails', () => {
		mockUseListMetrics.mockReturnValue({
			isFetching: false,
			isError: true,
			data: undefined,
			queryKey: ['/api/v2/metrics'],
		});

		render(<MetricNameSelector query={makeQuery()} onChange={jest.fn()} />);

		const input = screen.getByRole('combobox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'test' } });

		expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
	});

	it('shows loading spinner while fetching metrics', () => {
		mockUseListMetrics.mockReturnValue({
			isFetching: true,
			isError: false,
			data: undefined,
			queryKey: ['/api/v2/metrics'],
		});

		const { container } = render(
			<MetricNameSelector query={makeQuery()} onChange={jest.fn()} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'test' } });

		expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument();
	});

	it('preserves metric search text for signalSource normalization transition (undefined -> empty)', async () => {
		returnMetrics([makeMetric({ metricName: 'http_requests_total' })]);

		const query = makeQuery({
			aggregateAttribute: {
				key: 'http_requests_total',
				type: '',
				dataType: DataTypes.Float64,
			},
			aggregations: [
				{
					metricName: 'http_requests_total',
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					temporality: '',
				},
			] as MetricAggregation[],
		});

		const { rerender } = render(
			<MetricNameSelector
				query={query}
				onChange={jest.fn()}
				signalSource={undefined}
			/>,
		);

		rerender(
			<MetricNameSelector query={query} onChange={jest.fn()} signalSource="" />,
		);

		await waitFor(() => {
			const lastCall =
				mockUseListMetrics.mock.calls[mockUseListMetrics.mock.calls.length - 1];
			expect(lastCall?.[0]).toMatchObject({
				searchText: 'http_requests_total',
				limit: 100,
			});
		});
	});

	it('updates search text when metric name is hydrated after initial mount', async () => {
		returnMetrics([makeMetric({ metricName: 'signoz_latency.bucket' })]);

		const emptyQuery = makeQuery({
			aggregateAttribute: {
				key: '',
				type: '',
				dataType: DataTypes.Float64,
			},
			aggregations: [
				{
					metricName: '',
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					temporality: '',
				},
			] as MetricAggregation[],
		});

		const hydratedQuery = makeQuery({
			aggregateAttribute: {
				key: '',
				type: '',
				dataType: DataTypes.Float64,
			},
			aggregations: [
				{
					metricName: 'signoz_latency.bucket',
					timeAggregation: 'rate',
					spaceAggregation: 'sum',
					temporality: '',
				},
			] as MetricAggregation[],
		});

		const { rerender } = render(
			<MetricNameSelector
				query={emptyQuery}
				onChange={jest.fn()}
				signalSource=""
			/>,
		);

		rerender(
			<MetricNameSelector
				query={hydratedQuery}
				onChange={jest.fn()}
				signalSource=""
			/>,
		);

		await waitFor(() => {
			const lastCall =
				mockUseListMetrics.mock.calls[mockUseListMetrics.mock.calls.length - 1];
			expect(lastCall?.[0]).toMatchObject({
				searchText: 'signoz_latency.bucket',
				limit: 100,
			});
		});
	});
});

describe('selecting a metric type updates the aggregation options', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('Sum metric shows Rate/Increase time options and Sum/Avg/Min/Max space options', () => {
		returnMetrics([
			makeMetric({
				metricName: 'http_requests_total',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: true,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'http_requests_total' } });
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual(['Rate', 'Increase']);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'Sum',
			'Avg',
			'Min',
			'Max',
		]);
	});

	it('Gauge metric shows Latest/Sum/Avg/Min/Max/Count/Count Distinct time options and Sum/Avg/Min/Max space options', () => {
		returnMetrics([
			makeMetric({
				metricName: 'cpu_usage_percent',
				type: MetrictypesTypeDTO.gauge,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'cpu_usage_percent' } });
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([
			'Latest',
			'Sum',
			'Avg',
			'Min',
			'Max',
			'Count',
			'Count Distinct',
		]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'Sum',
			'Avg',
			'Min',
			'Max',
		]);
	});

	it('non-monotonic Sum metric is treated as Gauge', () => {
		returnMetrics([
			makeMetric({
				metricName: 'active_connections',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: false,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, {
			target: { value: 'active_connections' },
		});
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([
			'Latest',
			'Sum',
			'Avg',
			'Min',
			'Max',
			'Count',
			'Count Distinct',
		]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'Sum',
			'Avg',
			'Min',
			'Max',
		]);
	});

	it('Histogram metric shows no time options and P50–P99 space options', () => {
		returnMetrics([
			makeMetric({
				metricName: 'request_duration_seconds',
				type: MetrictypesTypeDTO.histogram,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, {
			target: { value: 'request_duration_seconds' },
		});
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'P50',
			'P75',
			'P90',
			'P95',
			'P99',
		]);
	});

	it('ExponentialHistogram metric shows no time options and P50–P99 space options', () => {
		returnMetrics([
			makeMetric({
				metricName: 'request_duration_exp',
				type: MetrictypesTypeDTO.exponentialhistogram,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, {
			target: { value: 'request_duration_exp' },
		});
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'P50',
			'P75',
			'P90',
			'P95',
			'P99',
		]);
	});

	it('unknown metric (typed name not in API results) shows all time and space options', () => {
		returnMetrics([makeMetric({ metricName: 'known_metric' })]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'unknown_metric' } });
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([
			'Max',
			'Min',
			'Sum',
			'Avg',
			'Count',
			'Rate',
			'Increase',
		]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'Sum',
			'Avg',
			'Min',
			'Max',
			'P50',
			'P75',
			'P90',
			'P95',
			'P99',
		]);
	});
});

// these tests require the previous state, so we setup it to
// tracks previousMetricInfo across metric selections
function StatefulMetricQueryHarness({
	initialQuery,
}: {
	initialQuery: IBuilderQuery;
}): JSX.Element {
	const [query, setQuery] = useState(initialQuery);

	useEffect(() => {
		handleSetQueryDataRef.current = (
			_index: number,
			newQuery: IBuilderQuery,
		): void => {
			setQuery(newQuery);
		};
		return (): void => {
			handleSetQueryDataRef.current = jest.fn();
		};
	}, []);

	const { handleChangeAggregatorAttribute, operators, spaceAggregationOptions } =
		useQueryOperations({
			query,
			index: 0,
			entityVersion: ENTITY_VERSION_V5,
		});

	const currentAggregation = query.aggregations?.[0] as MetricAggregation;

	return (
		<div>
			<MetricNameSelector
				query={query}
				onChange={handleChangeAggregatorAttribute}
			/>
			<ul data-testid="time-agg-options">
				{operators.map((op) => (
					<li key={op.value}>{op.label}</li>
				))}
			</ul>
			<ul data-testid="space-agg-options">
				{spaceAggregationOptions.map((op) => (
					<li key={op.value}>{op.label}</li>
				))}
			</ul>
			<div data-testid="selected-time-agg">
				{currentAggregation?.timeAggregation || ''}
			</div>
			<div data-testid="selected-space-agg">
				{currentAggregation?.spaceAggregation || ''}
			</div>
			<div data-testid="selected-metric-name">
				{currentAggregation?.metricName || ''}
			</div>
		</div>
	);
}

describe('switching between metrics of the same type preserves aggregation settings', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('Sum: preserves non-default increase/avg when switching to another Sum metric', () => {
		returnMetrics([
			makeMetric({
				metricName: 'metric_a',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: true,
			}),
			makeMetric({
				metricName: 'metric_b',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: true,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'metric_a',
						type: ATTRIBUTE_TYPES.SUM,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: 'increase',
							spaceAggregation: 'avg',
							metricName: 'metric_a',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('increase');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('avg');

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'metric_b' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('increase');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('avg');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'metric_b',
		);
	});

	it('Gauge: preserves non-default min/max when switching to another Gauge metric', () => {
		returnMetrics([
			makeMetric({
				metricName: 'cpu_usage',
				type: MetrictypesTypeDTO.gauge,
			}),
			makeMetric({
				metricName: 'mem_usage',
				type: MetrictypesTypeDTO.gauge,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'cpu_usage',
						type: ATTRIBUTE_TYPES.GAUGE,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: 'min',
							spaceAggregation: 'max',
							metricName: 'cpu_usage',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('min');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('max');

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'mem_usage' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('min');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('max');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'mem_usage',
		);
	});

	it('Histogram: preserves non-default p99 when switching to another Histogram metric', () => {
		returnMetrics([
			makeMetric({
				metricName: 'req_duration',
				type: MetrictypesTypeDTO.histogram,
			}),
			makeMetric({
				metricName: 'db_latency',
				type: MetrictypesTypeDTO.histogram,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'req_duration',
						type: ATTRIBUTE_TYPES.HISTOGRAM,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: '',
							spaceAggregation: 'p99',
							metricName: 'req_duration',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('p99');

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'db_latency' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('p99');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'db_latency',
		);
	});

	it('ExponentialHistogram: preserves non-default p75 when switching to another ExponentialHistogram metric', () => {
		returnMetrics([
			makeMetric({
				metricName: 'exp_hist_a',
				type: MetrictypesTypeDTO.exponentialhistogram,
			}),
			makeMetric({
				metricName: 'exp_hist_b',
				type: MetrictypesTypeDTO.exponentialhistogram,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'exp_hist_a',
						type: ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: '',
							spaceAggregation: 'p75',
							metricName: 'exp_hist_a',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('p75');

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'exp_hist_b' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('p75');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'exp_hist_b',
		);
	});
});

describe('switching to a different metric type resets aggregation to new defaults', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('Sum to Gauge: resets from increase/avg to the Gauge defaults avg/avg', () => {
		returnMetrics([
			makeMetric({
				metricName: 'sum_metric',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: true,
			}),
			makeMetric({
				metricName: 'gauge_metric',
				type: MetrictypesTypeDTO.gauge,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'sum_metric',
						type: ATTRIBUTE_TYPES.SUM,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: 'increase',
							spaceAggregation: 'avg',
							metricName: 'sum_metric',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'gauge_metric' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('avg');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('avg');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'gauge_metric',
		);
	});

	it('Gauge to Histogram: resets from min/max to the Histogram defaults (no time, p90 space)', () => {
		returnMetrics([
			makeMetric({
				metricName: 'gauge_metric',
				type: MetrictypesTypeDTO.gauge,
			}),
			makeMetric({
				metricName: 'hist_metric',
				type: MetrictypesTypeDTO.histogram,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'gauge_metric',
						type: ATTRIBUTE_TYPES.GAUGE,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: 'min',
							spaceAggregation: 'max',
							metricName: 'gauge_metric',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'hist_metric' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('p90');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'hist_metric',
		);
	});

	it('Histogram to Sum: resets from p99 to the Sum defaults rate/sum', () => {
		returnMetrics([
			makeMetric({
				metricName: 'hist_metric',
				type: MetrictypesTypeDTO.histogram,
			}),
			makeMetric({
				metricName: 'sum_metric',
				type: MetrictypesTypeDTO.sum,
				isMonotonic: true,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'hist_metric',
						type: ATTRIBUTE_TYPES.HISTOGRAM,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: '',
							spaceAggregation: 'p99',
							metricName: 'hist_metric',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'sum_metric' } });
		fireEvent.blur(input);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('rate');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('sum');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'sum_metric',
		);
	});
});

describe('typed metric not in search results is committed with unknown defaults', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('Gauge to unknown metric: resets from Gauge aggregations to unknown defaults (avg/avg)', () => {
		returnMetrics([
			makeMetric({
				metricName: 'cpu_usage',
				type: MetrictypesTypeDTO.gauge,
			}),
		]);

		render(
			<StatefulMetricQueryHarness
				initialQuery={makeQuery({
					aggregateAttribute: {
						key: 'cpu_usage',
						type: ATTRIBUTE_TYPES.GAUGE,
						dataType: DataTypes.Float64,
					},
					aggregations: [
						{
							timeAggregation: 'min',
							spaceAggregation: 'max',
							metricName: 'cpu_usage',
							temporality: '',
						},
					] as MetricAggregation[],
				})}
			/>,
		);

		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('min');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('max');

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'unknown_metric' } });
		fireEvent.blur(input);

		// Metric not in search results is committed with empty type resets to unknown defaults
		expect(screen.getByTestId('selected-time-agg')).toHaveTextContent('avg');
		expect(screen.getByTestId('selected-space-agg')).toHaveTextContent('avg');
		expect(screen.getByTestId('selected-metric-name')).toHaveTextContent(
			'unknown_metric',
		);
	});
});

describe('Summary metric type is treated as Gauge', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		handleSetQueryDataRef.current = jest.fn();
		returnMetrics([]);
	});

	it('selecting a Summary metric shows Gauge aggregation options', () => {
		returnMetrics([
			makeMetric({
				metricName: 'rpc_duration_summary',
				type: MetrictypesTypeDTO.summary,
			}),
		]);

		render(<MetricQueryHarness query={makeQuery()} />);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, {
			target: { value: 'rpc_duration_summary' },
		});
		fireEvent.blur(input);

		expect(getOptionLabels('time-agg-options')).toEqual([
			'Latest',
			'Sum',
			'Avg',
			'Min',
			'Max',
			'Count',
			'Count Distinct',
		]);
		expect(getOptionLabels('space-agg-options')).toEqual([
			'Sum',
			'Avg',
			'Min',
			'Max',
		]);
	});
});
