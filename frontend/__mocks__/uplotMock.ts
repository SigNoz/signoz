import type { Mock } from 'vitest';

/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock for uplot library used in tests
export interface MockUPlotInstance {
	setData: Mock;
	setSize: Mock;
	destroy: Mock;
	redraw: Mock;
	setSeries: Mock;
}

export interface MockUPlotPaths {
	spline: Mock;
	bars: Mock;
	linear: Mock;
	stepped: Mock;
}

// Create mock instance methods
const createMockUPlotInstance = (): MockUPlotInstance => ({
	setData: vi.fn(),
	setSize: vi.fn(),
	destroy: vi.fn(),
	redraw: vi.fn(),
	setSeries: vi.fn(),
});

// Path builder: (self, seriesIdx, idx0, idx1) => paths or null
const createMockPathBuilder = (name: string): Mock =>
	vi.fn(() => ({
		name, // To test if the correct pathBuilder is used
		stroke: vi.fn(),
		fill: vi.fn(),
		clip: vi.fn(),
	}));

// Create mock paths - linear, spline, stepped needed by UPlotSeriesBuilder.getPathBuilder
const mockPaths = {
	spline: vi.fn(() => createMockPathBuilder('spline')),
	bars: vi.fn(() => createMockPathBuilder('bars')),
	linear: vi.fn(() => createMockPathBuilder('linear')),
	stepped: vi.fn((opts?: { align?: number }) =>
		createMockPathBuilder(`stepped-(${opts?.align ?? 0})`),
	),
};

// Mock static methods
const mockTzDate = vi.fn(
	(date: Date, _timezone: string) => new Date(date.getTime()),
);

// Mock uPlot constructor - this needs to be a proper constructor function
function MockUPlot(
	_options: unknown,
	_data: unknown,
	_target: HTMLElement,
): MockUPlotInstance {
	return createMockUPlotInstance();
}

// Add static methods to the constructor
MockUPlot.tzDate = mockTzDate;
MockUPlot.paths = mockPaths;

// Export the constructor as default
export default MockUPlot;
