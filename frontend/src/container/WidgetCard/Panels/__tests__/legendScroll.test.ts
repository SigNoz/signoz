import { initialQueriesMap } from 'constants/queryBuilder';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { LegendPosition } from 'types/api/widgets/widget';

// Mock uPlot
vi.mock('uplot', () => {
	const paths = {
		spline: vi.fn(),
		bars: vi.fn(),
	};
	const uplotMock = vi.fn(() => ({
		paths,
	}));
	(uplotMock as unknown as { paths: unknown }).paths = paths;
	return {
		paths,
		default: uplotMock,
	};
});

// Mock dependencies
vi.mock('container/WidgetCard/Panels/enhancedLegend', () => ({
	calculateEnhancedLegendConfig: vi.fn(() => ({
		minHeight: 46,
		maxHeight: 80,
		calculatedHeight: 60,
		showScrollbar: false,
		requiredRows: 2,
	})),
	applyEnhancedLegendStyling: vi.fn(),
}));

const mockApiResponse = {
	data: {
		result: [
			{
				metric: { __name__: 'test_metric' },
				queryName: 'test_query',
				values: [
					[1640995200, '10'] as [number, string],
					[1640995260, '20'] as [number, string],
				],
			},
		],
		resultType: 'time_series',
		newResult: {
			data: {
				result: [],
				resultType: 'time_series',
			},
		},
	},
};

const mockDimensions = { width: 800, height: 400 };

const baseOptions = {
	id: 'test-widget',
	dimensions: mockDimensions,
	isDarkMode: false,
	apiResponse: mockApiResponse,
	enhancedLegend: true,
	legendPosition: LegendPosition.BOTTOM,
	softMin: null,
	softMax: null,
	query: initialQueriesMap.metrics,
};

describe('Legend Scroll Position Preservation', () => {
	let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame;

	beforeEach(() => {
		vi.clearAllMocks();
		originalRequestAnimationFrame = globalThis.requestAnimationFrame;
	});

	afterEach(() => {
		globalThis.requestAnimationFrame = originalRequestAnimationFrame;
	});

	it('should set up scroll position tracking in ready hook', () => {
		const mockSetScrollPosition = vi.fn();
		const options = getUPlotChartOptions({
			...baseOptions,
			setLegendScrollPosition: mockSetScrollPosition,
		});

		// Create mock chart with legend element
		const mockChart = {
			root: document.createElement('div'),
		} as any;

		const legend = document.createElement('div');
		legend.className = 'u-legend';
		mockChart.root.appendChild(legend);

		const addEventListenerSpy = vi.spyOn(legend, 'addEventListener');

		// Execute ready hook
		if (options.hooks?.ready) {
			options.hooks.ready.forEach((hook) => hook?.(mockChart));
		}

		// Verify that scroll event listener was added and cleanup function was stored
		expect(addEventListenerSpy).toHaveBeenCalledWith(
			'scroll',
			expect.any(Function),
		);
		expect(mockChart._legendScrollCleanup).toBeDefined();
	});

	it('should restore scroll position when provided', () => {
		const mockScrollPosition = { scrollTop: 50, scrollLeft: 10 };
		const mockSetScrollPosition = vi.fn();
		const options = getUPlotChartOptions({
			...baseOptions,
			legendScrollPosition: mockScrollPosition,
			setLegendScrollPosition: mockSetScrollPosition,
		});

		// Create mock chart with legend element
		const mockChart = {
			root: document.createElement('div'),
		} as any;

		const legend = document.createElement('div');
		legend.className = 'u-legend';
		legend.style.height = '20px';
		legend.style.width = '50px';
		legend.style.overflow = 'auto';
		const filler = document.createElement('div');
		filler.style.height = '200px';
		filler.style.width = '500px';
		legend.appendChild(filler);
		mockChart.root.appendChild(legend);
		document.body.appendChild(mockChart.root);

		// Mock requestAnimationFrame
		const mockRequestAnimationFrame = vi.fn((callback) => callback());
		globalThis.requestAnimationFrame = mockRequestAnimationFrame;

		// Execute ready hook
		if (options.hooks?.ready) {
			options.hooks.ready.forEach((hook) => hook?.(mockChart));
		}

		// Verify that requestAnimationFrame was called to restore scroll position
		expect(mockRequestAnimationFrame).toHaveBeenCalledWith(expect.any(Function));

		// Verify that the legend's scroll position was actually restored
		expect(legend.scrollTop).toBe(mockScrollPosition.scrollTop);
		expect(legend.scrollLeft).toBe(mockScrollPosition.scrollLeft);
		mockChart.root.remove();
	});

	it('should handle missing scroll position parameters gracefully', () => {
		const options = getUPlotChartOptions(baseOptions);

		// Should not throw error and should still create valid options
		expect(options.hooks?.ready).toBeDefined();
	});

	it('should work for both bottom and right legend positions', () => {
		const mockSetScrollPosition = vi.fn();
		const mockScrollPosition = { scrollTop: 30, scrollLeft: 15 };

		// Mock requestAnimationFrame for this test
		const mockRequestAnimationFrame = vi.fn((callback) => callback());
		globalThis.requestAnimationFrame = mockRequestAnimationFrame;

		// Test bottom legend position
		const bottomOptions = getUPlotChartOptions({
			...baseOptions,
			legendPosition: LegendPosition.BOTTOM,
			legendScrollPosition: mockScrollPosition,
			setLegendScrollPosition: mockSetScrollPosition,
		});

		// Test right legend position
		const rightOptions = getUPlotChartOptions({
			...baseOptions,
			legendPosition: LegendPosition.RIGHT,
			legendScrollPosition: mockScrollPosition,
			setLegendScrollPosition: mockSetScrollPosition,
		});

		// Both should have ready hooks
		expect(bottomOptions.hooks?.ready).toBeDefined();
		expect(rightOptions.hooks?.ready).toBeDefined();

		// Test bottom legend scroll restoration
		const bottomChart = {
			root: document.createElement('div'),
		} as any;
		const bottomLegend = document.createElement('div');
		bottomLegend.className = 'u-legend';
		bottomLegend.style.height = '20px';
		bottomLegend.style.width = '50px';
		bottomLegend.style.overflow = 'auto';
		const bottomFiller = document.createElement('div');
		bottomFiller.style.height = '200px';
		bottomFiller.style.width = '500px';
		bottomLegend.appendChild(bottomFiller);
		bottomChart.root.appendChild(bottomLegend);
		document.body.appendChild(bottomChart.root);

		// Execute bottom legend ready hook
		if (bottomOptions.hooks?.ready) {
			bottomOptions.hooks.ready.forEach((hook) => hook?.(bottomChart));
		}

		expect(bottomLegend.scrollTop).toBe(mockScrollPosition.scrollTop);
		expect(bottomLegend.scrollLeft).toBe(mockScrollPosition.scrollLeft);

		// Test right legend scroll restoration
		const rightChart = {
			root: document.createElement('div'),
		} as any;
		const rightLegend = document.createElement('div');
		rightLegend.className = 'u-legend';
		rightLegend.style.height = '20px';
		rightLegend.style.width = '50px';
		rightLegend.style.overflow = 'auto';
		const rightFiller = document.createElement('div');
		rightFiller.style.height = '200px';
		rightFiller.style.width = '500px';
		rightLegend.appendChild(rightFiller);
		rightChart.root.appendChild(rightLegend);
		document.body.appendChild(rightChart.root);

		// Execute right legend ready hook
		if (rightOptions.hooks?.ready) {
			rightOptions.hooks.ready.forEach((hook) => hook?.(rightChart));
		}

		expect(rightLegend.scrollTop).toBe(mockScrollPosition.scrollTop);
		expect(rightLegend.scrollLeft).toBe(mockScrollPosition.scrollLeft);
		bottomChart.root.remove();
		rightChart.root.remove();
	});
});
