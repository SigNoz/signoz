/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock for uplot library used in tests
export interface MockUPlotInstance {
	setData: jest.Mock;
	setSize: jest.Mock;
	destroy: jest.Mock;
	redraw: jest.Mock;
	setSeries: jest.Mock;
}

export interface MockUPlotPaths {
	spline: jest.Mock;
	bars: jest.Mock;
	linear: jest.Mock;
	stepped: jest.Mock;
}

// Create mock instance methods
const createMockUPlotInstance = (): MockUPlotInstance => ({
	setData: jest.fn(),
	setSize: jest.fn(),
	destroy: jest.fn(),
	redraw: jest.fn(),
	setSeries: jest.fn(),
});

// Path builder: (self, seriesIdx, idx0, idx1) => paths or null
const createMockPathBuilder = (name: string): jest.Mock =>
	jest.fn(() => ({
		name, // To test if the correct pathBuilder is used
		stroke: jest.fn(),
		fill: jest.fn(),
		clip: jest.fn(),
	}));

// Create mock paths - linear, spline, stepped needed by UPlotSeriesBuilder.getPathBuilder
const mockPaths = {
	spline: jest.fn(() => createMockPathBuilder('spline')),
	bars: jest.fn(() => createMockPathBuilder('bars')),
	linear: jest.fn(() => createMockPathBuilder('linear')),
	stepped: jest.fn((opts?: { align?: number }) =>
		createMockPathBuilder(`stepped-(${opts?.align ?? 0})`),
	),
};

// Mock static methods
const mockTzDate = jest.fn(
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
