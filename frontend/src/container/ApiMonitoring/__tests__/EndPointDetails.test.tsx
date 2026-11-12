import { useQueries } from 'react-query';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ENDPOINT_STATS_EXPRESSION_KEY } from 'container/ApiMonitoring/filterParamKeys';
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
} from 'container/TopNav/DateTimeSelectionV2/types';
import { getCurrentNuqsSearchParams, resetNuqsState } from 'tests/nuqs-helpers';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

import { SPAN_ATTRIBUTES } from '../Explorer/Domains/DomainDetails/constants';
import EndPointPicker from '../Explorer/Domains/DomainDetails/components/EndPointPicker';
import EndPointDetails from '../Explorer/Domains/DomainDetails/EndPointDetails';
import { FilterProviders } from './FilterProviders';

// Mock dependencies
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: jest.fn(),
}));

jest.mock('container/ApiMonitoring/utils', () => ({
	END_POINT_DETAILS_QUERY_KEYS_ARRAY: jest.requireActual(
		'container/ApiMonitoring/utils',
	).END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint: jest.fn(),
	getHttpUrlExpression: jest.requireActual('container/ApiMonitoring/utils')
		.getHttpUrlExpression,
	getEndPointDetailsQueryPayload: jest.fn(),
	getLatencyOverTimeWidgetData: jest.fn(),
	getRateOverTimeWidgetData: jest.fn(),
}));

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(({ onRun }) => (
		<div data-testid="query-builder-search">
			<button
				type="button"
				data-testid="filter-change-button"
				onClick={(): void => onRun("test.key = 'test-value'")}
			>
				Change Filter
			</button>
		</div>
	)),
}));

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
	'../Explorer/Domains/DomainDetails/components/EndPointPicker',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(({ onChange }) => (
			<div data-testid="endpoints-dropdown">
				<button
					type="button"
					data-testid="select-endpoint-button"
					onClick={(): void => onChange('/api/new-endpoint')}
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

function renderStats(ui: JSX.Element, linkFilter = ''): void {
	render(
		<FilterProviders
			queryParamKey={ENDPOINT_STATS_EXPRESSION_KEY}
			searchParams={
				linkFilter
					? `${ENDPOINT_STATS_EXPRESSION_KEY}=${encodeURIComponent(linkFilter)}`
					: ''
			}
		>
			{ui}
		</FilterProviders>,
	);
}

describe('EndPointDetails Component', () => {
	const mockQueryResults = Array(5).fill({
		data: { data: [] },
		isLoading: false,
		isError: false,
		error: null,
	});

	const mockProps = {
		domainName: 'test-domain',
		endPointName: '/api/test',
		setSelectedEndPointName: jest.fn(),
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
		resetNuqsState();

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
		renderStats(<EndPointDetails {...mockProps} />);

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
		renderStats(<EndPointDetails {...mockProps} />);

		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledWith(
			'test-domain',
			mockProps.timeRange.startTime,
			mockProps.timeRange.endTime,
			`${SPAN_ATTRIBUTES.HTTP_URL} = '/api/test'`,
		);
	});

	it('adds endpoint filter to initial filters', () => {
		renderStats(<EndPointDetails {...mockProps} />);

		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.stringContaining(`${SPAN_ATTRIBUTES.HTTP_URL} = '/api/test'`),
		);
	});

	it('updates filters when the search expression is run', async () => {
		renderStats(<EndPointDetails {...mockProps} />);

		// Trigger filter change
		fireEvent.click(screen.getByTestId('filter-change-button'));

		// Check that filters were updated in subsequent calls to utility functions
		expect(getEndPointDetailsQueryPayload).toHaveBeenCalledTimes(2);
		expect(getEndPointDetailsQueryPayload).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			`${SPAN_ATTRIBUTES.HTTP_URL} = '/api/test' AND (test.key = 'test-value')`,
		);
		await waitFor(() =>
			expect(getCurrentNuqsSearchParams().get(ENDPOINT_STATS_EXPRESSION_KEY)).toBe(
				"test.key = 'test-value'",
			),
		);
	});

	it('keeps the endpoint out of the editor and the picker options', () => {
		renderStats(<EndPointDetails {...mockProps} />, "service.name = 'checkout'");

		expect(QuerySearch).toHaveBeenLastCalledWith(
			expect.objectContaining({
				queryData: expect.objectContaining({
					filter: { expression: "service.name = 'checkout'" },
				}),
			}),
			expect.anything(),
		);
		expect(EndPointPicker).toHaveBeenLastCalledWith(
			expect.objectContaining({
				filterExpression: "service.name = 'checkout'",
				value: '/api/test',
			}),
			expect.anything(),
		);
	});

	it('handles endpoint dropdown selection', () => {
		renderStats(<EndPointDetails {...mockProps} />);

		// Trigger endpoint selection
		fireEvent.click(screen.getByTestId('select-endpoint-button'));

		// Check if endpoint was updated
		expect(mockProps.setSelectedEndPointName).toHaveBeenCalledWith(
			'/api/new-endpoint',
		);
	});

	it('does not display dependent services when service filter is applied', () => {
		renderStats(
			<EndPointDetails {...mockProps} />,
			"service.name = 'test-service'",
		);

		// Dependent services should not be displayed
		expect(screen.queryByTestId('dependent-services')).not.toBeInTheDocument();
	});

	it('passes the correct parameters to widget data generators', () => {
		renderStats(<EndPointDetails {...mockProps} />);

		expect(getRateOverTimeWidgetData).toHaveBeenCalledWith(
			'test-domain',
			'/api/test',
			expect.stringContaining(`${SPAN_ATTRIBUTES.HTTP_URL} = '/api/test'`),
		);

		expect(getLatencyOverTimeWidgetData).toHaveBeenCalledWith(
			'test-domain',
			'/api/test',
			expect.stringContaining(`${SPAN_ATTRIBUTES.HTTP_URL} = '/api/test'`),
		);
	});

	it('keeps the previous dependent services while a new filter loads', () => {
		renderStats(<EndPointDetails {...mockProps} />);

		const queries = jest.mocked(useQueries).mock.calls[0][0];
		expect(
			queries.map(({ queryKey, keepPreviousData }) => [
				(queryKey as unknown[])[0],
				keepPreviousData,
			]),
		).toStrictEqual(
			END_POINT_DETAILS_QUERY_KEYS_ARRAY.map((key) => [
				key,
				key === REACT_QUERY_KEY.GET_ENDPOINT_DEPENDENT_SERVICES_DATA,
			]),
		);
	});

	it('generates correct query parameters for useQueries', () => {
		renderStats(<EndPointDetails {...mockProps} />);

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
