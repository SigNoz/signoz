/* eslint-disable sonarjs/no-duplicate-string */
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { LegendPosition } from 'types/api/dashboard/getAll';

// Mock uPlot
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

// Mock dependencies
jest.mock('container/PanelWrapper/enhancedLegend', () => ({
	calculateEnhancedLegendConfig: jest.fn(() => ({
		minHeight: 46,
		maxHeight: 80,
		calculatedHeight: 60,
		showScrollbar: false,
		requiredRows: 2,
	})),
	applyEnhancedLegendStyling: jest.fn(),
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
};

describe('Legend Scroll Position Preservation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should set up scroll position tracking in ready hook', () => {
		const mockSetScrollPosition = jest.fn();
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

		const addEventListenerSpy = jest.spyOn(legend, 'addEventListener');

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
		const mockSetScrollPosition = jest.fn();
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
		legend.scrollTop = 0;
		legend.scrollLeft = 0;
		mockChart.root.appendChild(legend);

		// Mock requestAnimationFrame
		const mockRequestAnimationFrame = jest.fn((callback) => callback());
		global.requestAnimationFrame = mockRequestAnimationFrame;

		// Execute ready hook
		if (options.hooks?.ready) {
			options.hooks.ready.forEach((hook) => hook?.(mockChart));
		}

		// Verify that requestAnimationFrame was called to restore scroll position
		expect(mockRequestAnimationFrame).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should handle missing scroll position parameters gracefully', () => {
		const options = getUPlotChartOptions(baseOptions);

		// Should not throw error and should still create valid options
		expect(options.hooks?.ready).toBeDefined();
	});

	it('should work for both bottom and right legend positions', () => {
		const mockSetScrollPosition = jest.fn();
		const bottomOptions = getUPlotChartOptions({
			...baseOptions,
			setLegendScrollPosition: mockSetScrollPosition,
		});
		const rightOptions = getUPlotChartOptions({
			...baseOptions,
			legendPosition: LegendPosition.RIGHT,
			setLegendScrollPosition: mockSetScrollPosition,
		});

		// Both should have ready hooks
		expect(bottomOptions.hooks?.ready).toBeDefined();
		expect(rightOptions.hooks?.ready).toBeDefined();
	});
});
