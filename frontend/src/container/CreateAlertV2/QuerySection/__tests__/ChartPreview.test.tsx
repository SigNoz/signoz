/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/destructuring-assignment */
import { render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
} from 'container/CreateAlertV2/context/constants';
import { buildInitialAlertDef } from 'container/CreateAlertV2/context/utils';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { EQueryType } from 'types/common/dashboard';

import { CreateAlertProvider } from '../../context';
import ChartPreview from '../ChartPreview/ChartPreview';

const REQUESTS_PER_SEC = 'requests/sec';
const CHART_PREVIEW_NAME = 'Chart Preview';
const QUERY_TYPE_TEST_ID = 'query-type';
const GRAPH_TYPE_TEST_ID = 'graph-type';
const CHART_PREVIEW_COMPONENT_TEST_ID = 'chart-preview-component';
const PLOT_QUERY_TYPE_TEST_ID = 'plot-query-type';
const PLOT_PANEL_TYPE_TEST_ID = 'plot-panel-type';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock(
	'container/FormAlertRules/ChartPreview',
	() =>
		function MockChartPreviewComponent(props: any): JSX.Element {
			return (
				<div data-testid={CHART_PREVIEW_COMPONENT_TEST_ID}>
					<div data-testid="headline">{props.headline}</div>
					<div data-testid="name">{props.name}</div>
					<div data-testid={QUERY_TYPE_TEST_ID}>{props.query?.queryType}</div>
					<div data-testid="selected-interval">
						{props.selectedInterval?.startTime}
					</div>
					<div data-testid="y-axis-unit">{props.yAxisUnit}</div>
					<div data-testid={GRAPH_TYPE_TEST_ID}>{props.graphType}</div>
				</div>
			);
		},
);
jest.mock(
	'container/NewWidget/LeftContainer/WidgetGraph/PlotTag',
	() =>
		function MockPlotTag(props: any): JSX.Element {
			return (
				<div data-testid="plot-tag">
					<div data-testid={PLOT_QUERY_TYPE_TEST_ID}>{props.queryType}</div>
					<div data-testid={PLOT_PANEL_TYPE_TEST_ID}>{props.panelType}</div>
				</div>
			);
		},
);
jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

// Mock react-redux
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

const mockUseQueryBuilder = {
	currentQuery: {
		queryType: EQueryType.QUERY_BUILDER,
		unit: REQUESTS_PER_SEC,
		builder: {
			queryData: [
				{
					dataSource: 'metrics',
				},
			],
		},
	},
	panelType: PANEL_TYPES.TIME_SERIES,
	stagedQuery: {
		queryType: EQueryType.QUERY_BUILDER,
		unit: REQUESTS_PER_SEC,
	},
};

const mockAlertDef = buildInitialAlertDef(AlertTypes.METRICS_BASED_ALERT);

jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useCreateAlertState: (): any => ({
		alertState: {
			...INITIAL_ALERT_STATE,
			yAxisUnit: REQUESTS_PER_SEC,
		},
		thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
		setAlertState: jest.fn(),
		setThresholdState: jest.fn(),
	}),
}));

const renderChartPreview = (): ReturnType<typeof render> =>
	render(
		<Provider store={store}>
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
						<ChartPreview alertDef={mockAlertDef} />
					</CreateAlertProvider>
				</MemoryRouter>
			</QueryClientProvider>
		</Provider>,
	);

describe('ChartPreview', () => {
	const { useQueryBuilder } = jest.requireMock(
		'hooks/queryBuilder/useQueryBuilder',
	);

	beforeEach(() => {
		jest.clearAllMocks();
		useQueryBuilder.mockReturnValue(mockUseQueryBuilder);
	});

	it('renders the component with correct container class', () => {
		renderChartPreview();

		const container = screen
			.getByTestId(CHART_PREVIEW_COMPONENT_TEST_ID)
			.closest('.chart-preview-container');
		expect(container).toBeInTheDocument();
	});

	it('renders QueryBuilder chart preview when query type is QUERY_BUILDER', () => {
		renderChartPreview();

		expect(
			screen.getByTestId(CHART_PREVIEW_COMPONENT_TEST_ID),
		).toBeInTheDocument();
		expect(screen.getByTestId('plot-tag')).toBeInTheDocument();
		expect(screen.getByTestId(PLOT_QUERY_TYPE_TEST_ID)).toHaveTextContent(
			EQueryType.QUERY_BUILDER,
		);
		expect(screen.getByTestId(PLOT_PANEL_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.TIME_SERIES,
		);
	});

	it('renders QueryBuilder chart preview with empty name when query type is QUERY_BUILDER', () => {
		renderChartPreview();

		expect(screen.getByTestId('name')).toHaveTextContent('');
	});

	it('renders QueryBuilder chart preview with correct props', () => {
		renderChartPreview();

		expect(screen.getByTestId(QUERY_TYPE_TEST_ID)).toHaveTextContent(
			EQueryType.QUERY_BUILDER,
		);
		expect(screen.getByTestId('y-axis-unit')).toHaveTextContent(REQUESTS_PER_SEC);
		expect(screen.getByTestId(GRAPH_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.TIME_SERIES,
		);
		expect(screen.getByTestId('name')).toHaveTextContent('');
		expect(screen.getByTestId('headline')).toBeInTheDocument();
		expect(screen.getByTestId('selected-interval')).toBeInTheDocument();
	});

	it('renders PromQL chart preview when query type is PROM', () => {
		useQueryBuilder.mockReturnValue({
			...mockUseQueryBuilder,
			currentQuery: {
				...mockUseQueryBuilder.currentQuery,
				queryType: EQueryType.PROM,
			},
			stagedQuery: {
				queryType: EQueryType.PROM,
				unit: REQUESTS_PER_SEC,
			},
		});

		renderChartPreview();

		expect(
			screen.getByTestId(CHART_PREVIEW_COMPONENT_TEST_ID),
		).toBeInTheDocument();
		expect(screen.getByTestId('name')).toHaveTextContent(CHART_PREVIEW_NAME);
		expect(screen.getByTestId(QUERY_TYPE_TEST_ID)).toHaveTextContent(
			EQueryType.PROM,
		);
	});

	it('renders ClickHouse chart preview when query type is CLICKHOUSE', () => {
		useQueryBuilder.mockReturnValue({
			...mockUseQueryBuilder,
			currentQuery: {
				...mockUseQueryBuilder.currentQuery,
				queryType: EQueryType.CLICKHOUSE,
			},
			stagedQuery: {
				queryType: EQueryType.CLICKHOUSE,
				unit: REQUESTS_PER_SEC,
			},
		});

		renderChartPreview();

		expect(
			screen.getByTestId(CHART_PREVIEW_COMPONENT_TEST_ID),
		).toBeInTheDocument();
		expect(screen.getByTestId('name')).toHaveTextContent(CHART_PREVIEW_NAME);
		expect(screen.getByTestId(QUERY_TYPE_TEST_ID)).toHaveTextContent(
			EQueryType.CLICKHOUSE,
		);
	});

	it('uses default panel type when panelType is not provided', () => {
		useQueryBuilder.mockReturnValue({
			...mockUseQueryBuilder,
			panelType: undefined,
		});

		renderChartPreview();

		expect(screen.getByTestId(PLOT_PANEL_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.TIME_SERIES,
		);
		expect(screen.getByTestId(GRAPH_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.TIME_SERIES,
		);
		expect(screen.getByTestId(QUERY_TYPE_TEST_ID)).toHaveTextContent(
			EQueryType.QUERY_BUILDER,
		);
	});

	it('uses custom panel type when provided', () => {
		useQueryBuilder.mockReturnValue({
			...mockUseQueryBuilder,
			panelType: PANEL_TYPES.BAR,
		});

		renderChartPreview();

		expect(screen.getByTestId(PLOT_PANEL_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.BAR,
		);
		expect(screen.getByTestId(GRAPH_TYPE_TEST_ID)).toHaveTextContent(
			PANEL_TYPES.BAR,
		);
	});
});
