import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { StatusCodes } from 'http-status-codes';
import {
	publicDashboardResponse,
	publicDashboardWidgetData,
} from 'mocks-server/__mockdata__/publicDashboard';
import { rest, server } from 'mocks-server/server';
import { Layout } from 'react-grid-layout';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { SuccessResponseV2 } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';
import { EQueryType } from 'types/common/dashboard';

import PublicDashboardContainer from '../PublicDashboardContainer';

// Mock dependencies
jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn(() => false),
}));

jest.mock('lib/getMinMax', () => ({
	__esModule: true,
	default: jest.fn((interval: string) => {
		if (interval === '1h') {
			return {
				minTime: 1000000000000,
				maxTime: 2000000000000,
			};
		}
		return {
			minTime: 500000000000,
			maxTime: 1000000000000,
		};
	}),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: ({
		onTimeChange,
	}: {
		onTimeChange: (interval: string, dateTimeRange?: [number, number]) => void;
	}): JSX.Element => (
		<div data-testid="datetime-selection">
			<button
				type="button"
				onClick={(): void => onTimeChange('1h')}
				aria-label="Change time to 1 hour"
			>
				Change Time
			</button>
			<button
				type="button"
				onClick={(): void => onTimeChange('custom', [1000000, 2000000])}
				aria-label="Set custom time range"
			>
				Custom Time
			</button>
		</div>
	),
}));

jest.mock('../Panel', () => ({
	__esModule: true,
	default: ({
		widget,
		startTime,
		endTime,
	}: {
		widget: Widgets;
		startTime: number;
		endTime: number;
	}): JSX.Element => (
		<div data-testid={`panel-${widget.id}`}>
			<span>
				Panel: {widget.id} ({startTime}-{endTime})
			</span>
		</div>
	),
}));

jest.mock('react-grid-layout', () => ({
	__esModule: true,
	default: ({
		children,
		layout,
		style,
	}: {
		children: React.ReactNode;
		layout: Layout[];
		style?: React.CSSProperties;
	}): JSX.Element => (
		<div
			data-testid="grid-layout"
			data-layout={JSON.stringify(layout)}
			style={style}
		>
			{children}
		</div>
	),
	WidthProvider: (
		Component: React.ComponentType<unknown>,
	): React.ComponentType<unknown> => Component,
}));

// Mock dayjs
jest.mock('dayjs', () => {
	const actualDayjs = jest.requireActual('dayjs');
	const mockUnix = jest.fn(() => 1000);
	const mockUtcOffset = jest.fn(() => 0);
	const mockTzMethod = jest.fn(() => ({
		utcOffset: mockUtcOffset,
	}));
	const mockSubtract = jest.fn(() => ({
		subtract: jest.fn(),
		unix: mockUnix,
		tz: mockTzMethod,
	}));
	const mockDayjs = jest.fn(() => ({
		subtract: mockSubtract,
		unix: mockUnix,
		tz: mockTzMethod,
	}));
	Object.keys(actualDayjs).forEach((key) => {
		((mockDayjs as unknown) as Record<string, unknown>)[
			key
		] = (actualDayjs as Record<string, unknown>)[key];
	});
	((mockDayjs as unknown) as { extend: jest.Mock }).extend = jest.fn();
	((mockDayjs as unknown) as { tz: { guess: jest.Mock } }).tz = {
		guess: jest.fn(() => 'UTC'),
	};
	return mockDayjs;
});

const mockUseIsDarkMode = jest.mocked(useIsDarkMode);

// MSW setup
beforeAll(() => {
	server.listen();
});

afterAll(() => {
	server.close();
});

afterEach(() => {
	server.resetHandlers();
});

// Test constants
const MOCK_PUBLIC_DASHBOARD_ID = 'test-dashboard-id';
const MOCK_PUBLIC_PATH = '/public/dashboard/test';
const DEFAULT_TIME_RANGE = '30m';
// Use title from mock data
const TEST_DASHBOARD_TITLE = publicDashboardResponse.data.dashboard.data.title;
// Use widget ID from mock data
const WIDGET_1_ID =
	publicDashboardResponse.data.dashboard.data.widgets?.[0]?.id || 'widget-1';
const WIDGET_1_TITLE = 'Widget 1';
const ROW_PANEL_ID = 'row-1';
const ROW_PANEL_TITLE = 'Row Panel';

// Type definitions
interface MockWidget {
	id: string;
	panelTypes: PANEL_TYPES | PANEL_GROUP_TYPES;
	title: string;
	query?: Widgets['query'];
	description?: string;
	opacity?: string;
	nullZeroValues?: string;
	timePreferance?: string;
	softMin?: number | null;
	softMax?: number | null;
	selectedLogFields?: null;
	selectedTracesFields?: null;
}

interface MockPublicDashboardData {
	dashboard: {
		data: {
			title: string;
			widgets?: MockWidget[];
			layout?: Layout[];
			panelMap?: Record<string, { widgets: Layout[]; collapsed: boolean }>;
			variables?: Record<string, unknown>;
		};
	};
	publicDashboard: {
		timeRangeEnabled: boolean;
		defaultTimeRange: string;
		publicPath: string;
	};
}

// Helper function to create mock query
const createMockQuery = (): Widgets['query'] => ({
	builder: {
		queryData: [],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	clickhouse_sql: [],
	promql: [],
	id: 'query-1',
	queryType: EQueryType.QUERY_BUILDER,
});

// Base mock data - transform publicDashboardResponse to match component's expected format
const baseMockData: SuccessResponseV2<PublicDashboardDataProps> = {
	data: (publicDashboardResponse.data as unknown) as PublicDashboardDataProps,
	httpStatusCode: StatusCodes.OK,
};

// Helper function to create mock data with optional overrides
const createMockData = (
	overrides?: Partial<MockPublicDashboardData>,
): SuccessResponseV2<PublicDashboardDataProps> => {
	if (!overrides) {
		return baseMockData;
	}

	const baseData = baseMockData.data;

	// Apply overrides if provided
	const mergedData: PublicDashboardDataProps = {
		dashboard:
			(overrides?.dashboard as PublicDashboardDataProps['dashboard']) ||
			baseData.dashboard,
		publicDashboard: overrides?.publicDashboard || baseData.publicDashboard,
	};

	return {
		data: mergedData,
		httpStatusCode: StatusCodes.OK,
	};
};

describe('Public Dashboard Container', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsDarkMode.mockReturnValue(false);

		// Set up default MSW handler for widget query range API
		server.use(
			rest.get(
				'*/public/dashboards/:dashboardId/widgets/:widgetIndex/query_range',
				(_req, res, ctx) =>
					res(ctx.status(StatusCodes.OK), ctx.json(publicDashboardWidgetData)),
			),
		);
	});

	describe('Rendering', () => {
		it('should render dashboard with title and brand logo', () => {
			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={baseMockData}
				/>,
			);

			expect(screen.getByText(TEST_DASHBOARD_TITLE)).toBeInTheDocument();
			expect(screen.getByText('SigNoz')).toBeInTheDocument();
			expect(screen.getByAltText('SigNoz')).toBeInTheDocument();
		});

		it('should render time range selector when timeRangeEnabled is true', () => {
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: true,
					defaultTimeRange: DEFAULT_TIME_RANGE,
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByTestId('datetime-selection')).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /change time to 1 hour/i }),
			).toBeInTheDocument();
		});

		it('should not render time range selector when timeRangeEnabled is false', () => {
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: false,
					defaultTimeRange: DEFAULT_TIME_RANGE,
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.queryByTestId('datetime-selection')).not.toBeInTheDocument();
		});

		it('should render widgets in grid layout', () => {
			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={baseMockData}
				/>,
			);

			expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
			expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`Panel: ${WIDGET_1_ID}`)),
			).toBeInTheDocument();
		});

		it('should handle empty dashboard data gracefully', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: 'Empty Dashboard',
						widgets: [],
						layout: [],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByText('Empty Dashboard')).toBeInTheDocument();
			expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
		});
	});

	describe('Time Range Handling', () => {
		it('should initialize with default time range from publicDashboard', () => {
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: true,
					defaultTimeRange: '1h',
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			// Panel should receive the initial time range
			expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
		});

		it('should update time range when time change handler is called with interval', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: true,
					defaultTimeRange: DEFAULT_TIME_RANGE,
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			const timeChangeButton = screen.getByRole('button', {
				name: /change time to 1 hour/i,
			});
			await user.click(timeChangeButton);

			await waitFor(() => {
				const panel = screen.getByTestId(`panel-${WIDGET_1_ID}`);
				expect(panel).toBeInTheDocument();
			});
		});

		it('should update time range when time change handler is called with custom dateTimeRange', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: true,
					defaultTimeRange: DEFAULT_TIME_RANGE,
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			const customTimeButton = screen.getByRole('button', {
				name: /set custom time range/i,
			});
			await user.click(customTimeButton);

			await waitFor(() => {
				// Panel should receive updated time range
				expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
			});
		});

		it('should use default time range of 30m when defaultTimeRange is not provided', () => {
			const mockData = createMockData({
				publicDashboard: {
					timeRangeEnabled: true,
					defaultTimeRange: (undefined as unknown) as string,
					publicPath: MOCK_PUBLIC_PATH,
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
		});
	});

	describe('Panel Rendering', () => {
		it('should render row panel when widget panelTypes is ROW', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: ROW_PANEL_ID,
								panelTypes: PANEL_GROUP_TYPES.ROW,
								title: ROW_PANEL_TITLE,
							},
						],
						layout: [
							{
								i: ROW_PANEL_ID,
								x: 0,
								y: 0,
								w: 12,
								h: 2,
							},
						],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByText(ROW_PANEL_TITLE)).toBeInTheDocument();
		});

		it('should render collapsed row panel with widget count', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: ROW_PANEL_ID,
								panelTypes: PANEL_GROUP_TYPES.ROW,
								title: ROW_PANEL_TITLE,
							},
						],
						layout: [
							{
								i: ROW_PANEL_ID,
								x: 0,
								y: 0,
								w: 12,
								h: 2,
							},
						],
						panelMap: {
							[ROW_PANEL_ID]: {
								widgets: [
									{ i: 'w1', x: 0, y: 0, w: 6, h: 6 },
									{ i: 'w2', x: 6, y: 0, w: 6, h: 6 },
								],
								collapsed: true,
							},
						},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByText(/Row Panel \(2 widgets\)/)).toBeInTheDocument();
		});

		it('should render collapsed row panel with singular widget count', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: ROW_PANEL_ID,
								panelTypes: PANEL_GROUP_TYPES.ROW,
								title: ROW_PANEL_TITLE,
							},
						],
						layout: [
							{
								i: ROW_PANEL_ID,
								x: 0,
								y: 0,
								w: 12,
								h: 2,
							},
						],
						panelMap: {
							[ROW_PANEL_ID]: {
								widgets: [{ i: 'w1', x: 0, y: 0, w: 6, h: 6 }],
								collapsed: true,
							},
						},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByText(/Row Panel \(1 widget\)/)).toBeInTheDocument();
		});

		it('should render regular panel for non-ROW widget types', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: WIDGET_1_ID,
								panelTypes: PANEL_TYPES.TIME_SERIES,
								title: WIDGET_1_TITLE,
								query: createMockQuery(),
							},
						],
						layout: [
							{
								i: WIDGET_1_ID,
								x: 0,
								y: 0,
								w: 6,
								h: 6,
							},
						],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
			expect(
				screen.getByText(new RegExp(`Panel: ${WIDGET_1_ID}`)),
			).toBeInTheDocument();
		});

		it('should handle missing widget in layout gracefully', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: WIDGET_1_ID,
								panelTypes: PANEL_TYPES.TIME_SERIES,
								title: WIDGET_1_TITLE,
								query: createMockQuery(),
							},
						],
						layout: [
							{
								i: 'missing-widget',
								x: 0,
								y: 0,
								w: 6,
								h: 6,
							},
						],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			// Should render panel with fallback widget data
			expect(screen.getByTestId('panel-missing-widget')).toBeInTheDocument();
			expect(screen.getByText(/Panel: missing-widget/)).toBeInTheDocument();
		});
	});

	describe('Dark Mode', () => {
		it('should apply dark mode styles when isDarkMode is true', () => {
			mockUseIsDarkMode.mockReturnValue(true);

			const { container } = render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={baseMockData}
				/>,
			);

			const gridLayout = container.querySelector('[data-testid="grid-layout"]');
			expect(gridLayout).toBeInTheDocument();
			if (gridLayout) {
				expect(gridLayout).toHaveStyle({ backgroundColor: '' });
			}
		});

		it('should apply light mode styles when isDarkMode is false', () => {
			mockUseIsDarkMode.mockReturnValue(false);

			const { container } = render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={baseMockData}
				/>,
			);

			const gridLayout = container.querySelector('[data-testid="grid-layout"]');
			expect(gridLayout).toBeInTheDocument();
			if (gridLayout) {
				// themeColors.snowWhite is '#fafafa' which computes to 'rgb(250, 250, 250)'
				expect(gridLayout).toHaveStyle({
					backgroundColor: 'rgb(250, 250, 250)',
				});
			}
		});
	});

	describe('Edge Cases', () => {
		it('should handle undefined dashboard data', () => {
			const mockData: SuccessResponseV2<PublicDashboardDataProps> = {
				data: {
					dashboard: (undefined as unknown) as PublicDashboardDataProps['dashboard'],
					publicDashboard: {
						timeRangeEnabled: false,
						defaultTimeRange: DEFAULT_TIME_RANGE,
						publicPath: MOCK_PUBLIC_PATH,
					},
				},
				httpStatusCode: StatusCodes.OK,
			};

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByText('SigNoz')).toBeInTheDocument();
		});

		it('should handle missing layout data', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: WIDGET_1_ID,
								panelTypes: PANEL_TYPES.TIME_SERIES,
								title: WIDGET_1_TITLE,
								query: createMockQuery(),
							},
						],
						layout: (undefined as unknown) as Layout[],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			// Component should render without errors even with missing layout
			expect(screen.getByText(TEST_DASHBOARD_TITLE)).toBeInTheDocument();
		});

		it('should handle multiple widgets in layout', () => {
			const mockData = createMockData({
				dashboard: {
					data: {
						title: TEST_DASHBOARD_TITLE,
						widgets: [
							{
								id: WIDGET_1_ID,
								panelTypes: PANEL_TYPES.TIME_SERIES,
								title: WIDGET_1_TITLE,
								query: createMockQuery(),
							},
							{
								id: 'widget-2',
								panelTypes: PANEL_TYPES.TABLE,
								title: 'Widget 2',
								query: createMockQuery(),
							},
						],
						layout: [
							{
								i: WIDGET_1_ID,
								x: 0,
								y: 0,
								w: 6,
								h: 6,
							},
							{
								i: 'widget-2',
								x: 6,
								y: 0,
								w: 6,
								h: 6,
							},
						],
						panelMap: {},
						variables: {},
					},
				},
			});

			render(
				<PublicDashboardContainer
					publicDashboardId={MOCK_PUBLIC_DASHBOARD_ID}
					publicDashboardData={mockData}
				/>,
			);

			expect(screen.getByTestId(`panel-${WIDGET_1_ID}`)).toBeInTheDocument();
			expect(screen.getByTestId('panel-widget-2')).toBeInTheDocument();
		});
	});
});
