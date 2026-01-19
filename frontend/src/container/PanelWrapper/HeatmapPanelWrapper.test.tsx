/* eslint-disable sonarjs/no-duplicate-string */
import { render, RenderResult, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryClient, QueryClientProvider, UseQueryResult } from 'react-query';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';

import HeatmapPanelWrapper from './HeatmapPanelWrapper';
import { PanelWrapperProps } from './panelWrapper.types';

// Mock dependencies
jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn(() => false),
}));

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: jest.fn(() => ({ width: 800, height: 600 })),
}));

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: jest.fn(() => ({
		toScrollWidgetId: '',
		setToScrollWidgetId: jest.fn(),
	})),
}));

jest.mock('providers/Timezone', () => ({
	useTimezone: jest.fn(() => ({
		timezone: { value: 'UTC' },
	})),
}));

jest.mock('container/QueryTable/Drilldown/useGraphContextMenu', () => ({
	__esModule: true,
	default: jest.fn(() => ({
		menuItemsConfig: {
			header: 'Context Menu',
			items: [],
		},
	})),
}));

jest.mock('periscope/components/ContextMenu', () => ({
	ContextMenu: (): JSX.Element => (
		<div data-testid="context-menu">Context Menu</div>
	),
	useCoordinates: jest.fn(() => ({
		coordinates: { x: 0, y: 0 },
		popoverPosition: 'bottom',
		clickedData: null,
		onClose: jest.fn(),
		onClick: jest.fn(),
		subMenu: null,
		setSubMenu: jest.fn(),
	})),
}));

jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: ({ data }: { data: any[] }): JSX.Element => (
		<div data-testid="uplot-component">Uplot: {data.length} series</div>
	),
}));

jest.mock('container/GridCardLayout/GridCard/FullView/GraphManager', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="graph-manager">Graph Manager</div>
	),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
};

const mockStore = configureStore([]);
const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false },
	},
});

/* eslint-disable sonarjs/no-duplicate-string */
describe('HeatmapPanelWrapper Component', () => {
	const createMockQueryResponse = (
		bucketData?: any,
	): UseQueryResult<SuccessResponse<MetricRangePayloadProps, unknown>, Error> =>
		(({
			data: {
				payload: {
					data: {
						result: bucketData
							? [
									{
										bucketBounds: [10, 20, 30, 40, 50],
										bucketStarts: [0, 10, 20, 30, 40],
										counts: [
											[5, 10, 15, 20, 25],
											[8, 12, 18, 22, 28],
										],
										timestamps: [1000, 2000],
										queryName: 'A',
										bucketCount: 0,
									},
							  ]
							: [],
					},
				},
				params: {
					start: 0,
					end: 3000,
				},
			},
		} as unknown) as UseQueryResult<
			SuccessResponse<MetricRangePayloadProps, unknown>,
			Error
		>);

	const createMockWidget = (overrides = {}): Widgets =>
		(({
			id: 'widget-1',
			query: {
				queryType: 'QUERY_BUILDER',
				builder: {
					queryData: [
						{
							dataSource: DataSource.METRICS,
							queryName: 'A',
						},
					],
				},
			},
			panelTypes: PANEL_TYPES.HEATMAP,
			yAxisUnit: 'ms',
			isLogScale: false,
			heatmapColorPalette: 'default',
			...overrides,
		} as unknown) as Widgets);

	const renderComponent = (props: Partial<PanelWrapperProps>): RenderResult => {
		const store = mockStore({
			globalTime: {
				minTime: 0,
				maxTime: 3000,
			},
		});

		return render(
			<Provider store={store}>
				<QueryClientProvider client={queryClient}>
					<HeatmapPanelWrapper {...(props as PanelWrapperProps)} />
				</QueryClientProvider>
			</Provider>,
		);
	};

	it('renders "No Data" when query response is empty', () => {
		const props = {
			queryResponse: createMockQueryResponse(),
			widget: createMockWidget(),
			graphVisibility: [],
			setGraphVisibility: jest.fn(),
			isFullViewMode: false,
			onToggleModelHandler: jest.fn(),
		};

		renderComponent(props);

		expect(screen.getByText('No Data')).toBeInTheDocument();
	});

	it('renders heatmap when valid data is provided', () => {
		const props = {
			queryResponse: createMockQueryResponse({
				bucketBounds: [10, 20, 30],
				counts: [[5, 10, 15]],
				timestamps: [1000],
			}),
			widget: createMockWidget(),
			graphVisibility: [],
			setGraphVisibility: jest.fn(),
			isFullViewMode: false,
			onToggleModelHandler: jest.fn(),
		};

		renderComponent(props);

		expect(screen.getByTestId('uplot-component')).toBeInTheDocument();
	});

	it('renders GraphManager in full view mode', () => {
		const props = {
			queryResponse: createMockQueryResponse({
				bucketBounds: [10, 20, 30],
				counts: [[5, 10, 15]],
				timestamps: [1000],
			}),
			widget: createMockWidget(),
			graphVisibility: [],
			setGraphVisibility: jest.fn(),
			isFullViewMode: true,
			onToggleModelHandler: jest.fn(),
		};

		renderComponent(props);

		expect(screen.getByTestId('graph-manager')).toBeInTheDocument();
	});
});
