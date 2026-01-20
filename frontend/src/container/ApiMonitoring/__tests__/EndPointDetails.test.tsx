import { fireEvent, render, screen } from '@testing-library/react';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint,
	getEndPointDetailsQueryPayload,
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
} from 'container/ApiMonitoring/utils';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useQueries } from 'react-query';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import { SPAN_ATTRIBUTES } from '../Explorer/Domains/DomainDetails/constants';
import EndPointDetails from '../Explorer/Domains/DomainDetails/EndPointDetails';

// Mock dependencies
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: jest.fn(),
}));

// Mock useApiMonitoringParams hook
jest.mock('container/ApiMonitoring/queryParams', () => ({
	useApiMonitoringParams: jest.fn().mockReturnValue([
		{
			showIP: true,
			selectedDomain: '',
			selectedView: 'all_endpoints',
			selectedEndPointName: '',
			groupBy: [],
			allEndpointsLocalFilters: undefined,
			endPointDetailsLocalFilters: undefined,
			modalTimeRange: undefined,
			selectedInterval: undefined,
		},
		jest.fn(),
	]),
}));

jest.mock('container/ApiMonitoring/utils', () => ({
	END_POINT_DETAILS_QUERY_KEYS_ARRAY: [
		'endPointMetricsData',
		'endPointStatusCodeData',
		'endPointDropDownData',
		'endPointDependentServicesData',
		'endPointStatusCodeBarChartsData',
		'endPointStatusCodeLatencyBarChartsData',
	],
	extractPortAndEndpoint: jest.fn(),
	getEndPointDetailsQueryPayload: jest.fn(),
	getLatencyOverTimeWidgetData: jest.fn(),
	getRateOverTimeWidgetData: jest.fn(),
}));

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(({ onChange }) => (
			<div data-testid="query-builder-search">
				<button
					type="button"
					data-testid="filter-change-button"
					onClick={(): void =>
						onChange({
							items: [
								{
									id: 'test-filter',
									key: {
										key: 'test.key',
										dataType: DataTypes.String,
										type: 'tag',
									},
									op: '=',
									value: 'test-value',
								},
							],
							op: 'AND',
						})
					}
				>
					Change Filter
				</button>
			</div>
		)),
	}),
);

// Mock all child components to simplify testing
jest.mock(
	'../Explorer/Domains/DomainDetails/components/EndPointMetrics',
	() => ({
		__esModule: true,
		default: jest
			.fn()
			.mockImplementation(() => (
				<div data-testid="endpoint-metrics">EndPoint Metrics</div>
			)),
	}),
);

jest.mock(
	'../Explorer/Domains/DomainDetails/components/EndPointsDropDown',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(({ setSelectedEndPointName }) => (
			<div data-testid="endpoints-dropdown">
				<button
					type="button"
					data-testid="select-endpoint-button"
					onClick={(): void => setSelectedEndPointName('/api/new-endpoint')}
				>
					Select Endpoint
				</button>
			</div>
		)),
	}),
);

jest.mock(
	'../Explorer/Domains/DomainDetails/components/DependentServices',
	() => ({
		__esModule: true,
		default: jest
			.fn()
			.mockImplementation(() => (
				<div data-testid="dependent-services">Dependent Services</div>
			)),
	}),
);

jest.mock(
	'../Explorer/Domains/DomainDetails/components/StatusCodeBarCharts',
	() => ({
		__esModule: true,
		default: jest
			.fn()
			.mockImplementation(() => (
				<div data-testid="status-code-bar-charts">Status Code Bar Charts</div>
			)),
	}),
);

jest.mock(
	'../Explorer/Domains/DomainDetails/components/StatusCodeTable',
	() => ({
		__esModule: true,
		default: jest
			.fn()
			.mockImplementation(() => (
				<div data-testid="status-code-table">Status Code Table</div>
			)),
	}),
);

jest.mock(
	'../Explorer/Domains/DomainDetails/components/MetricOverTimeGraph',
	() => ({
		__esModule: true,
		default: jest
			.fn()
			.mockImplementation(({ widget }) => (
				<div data-testid={`metric-graph-${widget.title}`}>{widget.title} Graph</div>
			)),
	}),
);

describe('EndPointDetails Component', () => {
	const mockQueryResults = Array(6).fill({
		data: { data: [] },
		isLoading: false,
		isError: false,
		error: null,
	});

	const mockProps = {
		// eslint-disable-next-line sonarjs/no-duplicate-string
		domainName: 'test-domain',
		endPointName: '/api/test',
		setSelectedEndPointName: jest.fn(),
		initialFilters: { items: [], op: 'AND' } as TagFilter,
		timeRange: {
			startTime: 1609459200000,
			endTime: 1609545600000,
		},
		handleTimeChange: jest.fn() as (
			interval: Time | CustomTimeType,
			dateTimeRange?: [number, number],
		) => void,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		(extractPortAndEndpoint as jest.Mock).mockReturnValue({
			port: '8080',
			endpoint: '/api/test',
		});

		(getEndPointDetailsQueryPayload as jest.Mock).mockReturnValue([
			{ id: 'query1', label: 'Query 1' },
			{ id: 'query2', label: 'Query 2' },
			{ id: 'query3', label: 'Query 3' },
			{ id: 'query4', label: 'Query 4' },
			{ id: 'query5', label: 'Query 5' },
			{ id: 'query6', label: 'Query 6' },
		]);

		(getRateOverTimeWidgetData as jest.Mock).mockReturnValue({
			title: 'Rate Over Time',
			id: 'rate-widget',
		});

		(getLatencyOverTimeWidgetData as jest.Mock).mockReturnValue({
			title: 'Latency Over Time',
			id: 'latency-widget',
		});

		(useQueries as jest.Mock).mockReturnValue(mockQueryResults);
	});

	it('renders the component correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		// Check all major components are rendered
		expect(screen.getByTestId('query-builder-search')).toBeInTheDocument();
		expect(screen.getByTestId('endpoints-dropdown')).toBeInTheDocument();
		expect(screen.getByTestId('endpoint-metrics')).toBeInTheDocument();
		expect(screen.getByTestId('dependent-services')).toBeInTheDocument();
		expect(screen.getByTestId('status-code-bar-charts')).toBeInTheDocument();
		expect(screen.getByTestId('status-code-table')).toBeInTheDocument();
		expect(screen.getByTestId('metric-graph-Rate Over Time')).toBeInTheDocument();
		expect(
			screen.getByTestId('metric-graph-Latency Over Time'),
		).toBeInTheDocument();

		// Check endpoint metadata is displayed
		expect(screen.getByText(/8080/i)).toBeInTheDocument();
		expect(screen.getByText('/api/test')).toBeInTheDocument();
	});

	it('calls getEndPointDetailsQueryPayload with correct parameters', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledWith(
			'test-domain',
			mockProps.timeRange.startTime,
			mockProps.timeRange.endTime,
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: SPAN_ATTRIBUTES.URL_PATH }),
						value: '/api/test',
					}),
				]),
				op: 'AND',
			}),
		);
	});

	it('adds endpoint filter to initial filters', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: SPAN_ATTRIBUTES.URL_PATH }),
						value: '/api/test',
					}),
				]),
			}),
		);
	});

	it('updates filters when QueryBuilderSearch changes', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		// Trigger filter change
		fireEvent.click(screen.getByTestId('filter-change-button'));

		// Check that filters were updated in subsequent calls to utility functions
		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledTimes(2);
		expect(getEndPointDetailsQueryPayload).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: 'test.key' }),
						value: 'test-value',
					}),
				]),
			}),
		);
	});

	it('handles endpoint dropdown selection', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		// Trigger endpoint selection
		fireEvent.click(screen.getByTestId('select-endpoint-button'));

		// Check if endpoint was updated
		expect(mockProps.setSelectedEndPointName).toHaveBeenCalledWith(
			'/api/new-endpoint',
		);
	});

	it('does not display dependent services when service filter is applied', () => {
		const propsWithServiceFilter = {
			...mockProps,
			initialFilters: {
				items: [
					{
						id: 'service-filter',
						key: {
							key: 'service.name',
							dataType: DataTypes.String,
							type: 'tag',
						},
						op: '=',
						value: 'test-service',
					},
				] as TagFilterItem[],
				op: 'AND',
			} as TagFilter,
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...propsWithServiceFilter} />);

		// Dependent services should not be displayed
		expect(screen.queryByTestId('dependent-services')).not.toBeInTheDocument();
	});

	it('passes the correct parameters to widget data generators', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		expect(getRateOverTimeWidgetData).toHaveBeenCalledWith(
			'test-domain',
			'/api/test',
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: SPAN_ATTRIBUTES.URL_PATH }),
						value: '/api/test',
					}),
				]),
			}),
		);

		expect(getLatencyOverTimeWidgetData).toHaveBeenCalledWith(
			'test-domain',
			'/api/test',
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({ key: SPAN_ATTRIBUTES.URL_PATH }),
						value: '/api/test',
					}),
				]),
			}),
		);
	});

	it('generates correct query parameters for useQueries', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointDetails {...mockProps} />);

		// Check if useQueries was called with correct parameters
		expect(useQueries).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					queryKey: expect.arrayContaining([END_POINT_DETAILS_QUERY_KEYS_ARRAY[0]]),
				}),
				expect.objectContaining({
					queryKey: expect.arrayContaining([END_POINT_DETAILS_QUERY_KEYS_ARRAY[1]]),
				}),
				// ... and so on for other queries
			]),
		);
	});
});
