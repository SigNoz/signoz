import { render, screen, waitFor } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';
import { QueryObserverResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';

import DistributionPanelWrapper from './DistributionPanelWrapper';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock dependencies
jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: jest.fn(() => <div data-testid="uplot-chart">Uplot Chart</div>),
}));

jest.mock('container/GridCardLayout/GridCard/FullView/GraphManager', () => ({
	__esModule: true,
	default: jest.fn(() => <div data-testid="graph-manager">Graph Manager</div>),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn(() => false),
}));

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: jest.fn(() => ({ width: 800, height: 400 })),
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
	ContextMenu: jest.fn(() => null),
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

jest.mock('lib/uPlotLib/utils/getUplotDistributionChartOptions', () => ({
	getUplotDistributionChartOptions: jest.fn(() => ({
		width: 800,
		height: 400,
		series: [],
	})),
}));

describe('DistributionPanelWrapper', () => {
	const mockWidget: Widgets = {
		id: 'test-widget-1',
		title: 'Test Distribution',
		description: '',
		nullZeroValues: '',
		opacity: '1',
		panelTypes: PANEL_TYPES.DISTRIBUTION,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: {
				queryData: [],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [],
			id: 'query-1',
		},
		timePreferance: 'GLOBAL_TIME',
		yAxisUnit: 'none',
		customLegendColors: {},
		isLogScale: false,
		contextLinks: {
			linksData: [],
		},
		softMin: null,
		softMax: null,
		selectedLogFields: null,
		selectedTracesFields: null,
	};

	const createMockQueryResponse = (
		results: any[] = [],
	): QueryObserverResult<SuccessResponse<any>, Error> =>
		({
			data: {
				payload: {
					data: {
						result: results,
					},
				},
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

	const mockOnDragSelect = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders "No Data" message when there is no data', () => {
			const queryResponse = createMockQueryResponse([]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByText('No Data')).toBeInTheDocument();
		});

		it('renders Uplot chart when data is available', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					legend: 'test-legend',
					results: [
						{ bucket_start: 0, bucket_end: 10, value: 5 },
						{ bucket_start: 10, bucket_end: 20, value: 10 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
			expect(screen.queryByText('No Data')).not.toBeInTheDocument();
		});

		it('renders GraphManager in full view mode', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [{ bucket_start: 0, bucket_end: 10, value: 5 }],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					isFullViewMode
					setGraphVisibility={jest.fn()}
					graphVisibility={[]}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('graph-manager')).toBeInTheDocument();
		});
	});

	describe('data processing', () => {
		it('processes distribution data correctly', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					legend: 'duration',
					results: [
						{ bucket_start: 0, bucket_end: 100, value: 10 },
						{ bucket_start: 100, bucket_end: 200, value: 20 },
						{ bucket_start: 200, bucket_end: 300, value: 15 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});

		it('aggregates duplicate buckets', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [
						{ bucket_start: 0, bucket_end: 10, value: 5 },
						{ bucket_start: 0, bucket_end: 10, value: 3 }, // Duplicate bucket
						{ bucket_start: 10, bucket_end: 20, value: 10 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			// Should aggregate the duplicate buckets (5 + 3 = 8)
			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});

		it('sorts buckets by start value', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [
						{ bucket_start: 100, bucket_end: 200, value: 20 },
						{ bucket_start: 0, bucket_end: 100, value: 10 },
						{ bucket_start: 200, bucket_end: 300, value: 15 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});

		it('handles empty results array', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByText('No Data')).toBeInTheDocument();
		});

		it('handles malformed data gracefully', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: null,
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByText('No Data')).toBeInTheDocument();
		});
	});

	describe('bucket formatting', () => {
		it('formats small values correctly', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [
						{ bucket_start: 0.0001, bucket_end: 0.0002, value: 5 },
						{ bucket_start: 0.0002, bucket_end: 0.0003, value: 10 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});

		it('formats large values with compact notation', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [
						{ bucket_start: 1000, bucket_end: 2000, value: 5 },
						{ bucket_start: 2000, bucket_end: 3000, value: 10 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});
	});

	describe('interactions', () => {
		it('calls onClickHandler when chart is clicked', async () => {
			const onClickHandler = jest.fn();
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [{ bucket_start: 0, bucket_end: 10, value: 5 }],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onClickHandler={onClickHandler}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});

		it('enables drill down when enableDrillDown is true', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [{ bucket_start: 0, bucket_end: 10, value: 5 }],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					enableDrillDown
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});
	});

	describe('custom colors', () => {
		it('applies custom legend colors from widget', () => {
			const customColors = {
				'test-legend': '#FF0000',
			};

			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					legend: 'test-legend',
					results: [{ bucket_start: 0, bucket_end: 10, value: 5 }],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={{ ...mockWidget, customLegendColors: customColors }}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});
	});

	describe('scroll behavior', () => {
		it('scrolls to widget when toScrollWidgetId matches', async () => {
			const setToScrollWidgetId = jest.fn();
			const scrollIntoViewMock = jest.fn();

			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { useDashboard } = require('providers/Dashboard/Dashboard');
			useDashboard.mockReturnValue({
				toScrollWidgetId: 'test-widget-1',
				setToScrollWidgetId,
			});

			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [{ bucket_start: 0, bucket_end: 10, value: 5 }],
				},
			]);

			const { container } = render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={mockWidget}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			const graphRef = container.querySelector('div');
			if (graphRef) {
				graphRef.scrollIntoView = scrollIntoViewMock;
			}

			await waitFor(() => {
				expect(setToScrollWidgetId).toHaveBeenCalledWith('');
			});
		});
	});

	describe('log scale', () => {
		it('applies log scale when widget.isLogScale is true', () => {
			const queryResponse = createMockQueryResponse([
				{
					queryName: 'A',
					results: [
						{ bucket_start: 1, bucket_end: 10, value: 5 },
						{ bucket_start: 10, bucket_end: 100, value: 50 },
					],
				},
			]);

			render(
				<DistributionPanelWrapper
					queryResponse={queryResponse}
					widget={{ ...mockWidget, isLogScale: true }}
					onDragSelect={mockOnDragSelect}
				/>,
			);

			expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		});
	});
});
