/* eslint-disable react/jsx-props-no-spreading */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { render, screen } from 'tests/test-utils';

import Threshold from '../Threshold';

// Mock the getColumnUnit function
jest.mock('lib/query/createTableColumnsFromQuery', () => ({
	getColumnUnit: jest.fn(
		(option: string, columnUnits: Record<string, string>) =>
			columnUnits[option] || 'percent',
	),
}));

// Mock the unitOptions function
jest.mock('container/NewWidget/utils', () => ({
	unitOptions: jest.fn(() => [
		{ value: 'none', label: 'None' },
		{ value: 'percent', label: 'Percent' },
		{ value: 'ms', label: 'Milliseconds' },
	]),
}));

const defaultProps = {
	index: 'test-threshold-1',
	keyIndex: 0,
	thresholdOperator: '>' as const,
	thresholdValue: 50,
	thresholdUnit: 'none',
	thresholdColor: 'Red',
	thresholdFormat: 'Text' as const,
	isEditEnabled: true,
	selectedGraph: PANEL_TYPES.TABLE,
	tableOptions: [
		{ value: 'cpu_usage', label: 'CPU Usage' },
		{ value: 'memory_usage', label: 'Memory Usage' },
	],
	thresholdTableOptions: 'cpu_usage',
	columnUnits: { cpu_usage: 'percent', memory_usage: 'bytes' },
	yAxisUnit: 'percent',
	moveThreshold: jest.fn(),
};

const renderThreshold = (props = {}): void => {
	render(
		<DndProvider backend={HTML5Backend}>
			<Threshold {...{ ...defaultProps, ...props }} />
		</DndProvider>,
	);
};

describe('Threshold Component Unit Validation', () => {
	it('should not show validation error when threshold unit is "none" regardless of column unit', () => {
		// Act - Render component with "none" threshold unit
		renderThreshold({
			thresholdUnit: 'none',
			thresholdValue: 50,
		});

		// Assert - No validation error should be displayed
		expect(
			screen.queryByText(/Threshold unit.*is not valid in comparison/i),
		).not.toBeInTheDocument();
	});

	it('should show validation error when threshold unit is not "none" and units are incompatible', () => {
		// Act - Render component with incompatible units (ms vs percent)
		renderThreshold({
			thresholdUnit: 'ms',
			thresholdValue: 50,
		});

		// Assert - Validation error should be displayed
		expect(
			screen.getByText(
				/Threshold unit \(ms\) is not valid in comparison with the column unit \(percent\)/i,
			),
		).toBeInTheDocument();
	});

	it('should not show validation error when threshold unit matches column unit', () => {
		// Act - Render component with matching units
		renderThreshold({
			thresholdUnit: 'percent',
			thresholdValue: 50,
		});

		// Assert - No validation error should be displayed
		expect(
			screen.queryByText(/Threshold unit.*is not valid in comparison/i),
		).not.toBeInTheDocument();
	});

	it('should show validation error for time series graph when units are incompatible', () => {
		// Act - Render component for time series with incompatible units
		renderThreshold({
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdUnit: 'ms',
			thresholdValue: 100,
			yAxisUnit: 'percent',
		});

		// Assert - Validation error should be displayed
		expect(
			screen.getByText(
				/Threshold unit \(ms\) is not valid in comparison with the y-axis unit \(percent\)/i,
			),
		).toBeInTheDocument();
	});

	it('should not show validation error for time series graph when threshold unit is "none"', () => {
		// Act - Render component for time series with "none" threshold unit
		renderThreshold({
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdUnit: 'none',
			thresholdValue: 100,
			yAxisUnit: 'percent',
		});

		// Assert - No validation error should be displayed
		expect(
			screen.queryByText(/Threshold unit.*is not valid in comparison/i),
		).not.toBeInTheDocument();
	});

	it('should not show validation error when threshold unit is compatible with column unit', () => {
		// Act - Render component with compatible units (both in same category - Time)
		renderThreshold({
			thresholdUnit: 's',
			thresholdValue: 100,
			columnUnits: { cpu_usage: 'ms' },
			thresholdTableOptions: 'cpu_usage',
		});

		// Assert - No validation error should be displayed
		expect(
			screen.queryByText(/Threshold unit.*is not valid in comparison/i),
		).not.toBeInTheDocument();
	});

	it('should show validation error when threshold unit is in different category than column unit', () => {
		// Act - Render component with units from different categories
		renderThreshold({
			thresholdUnit: 'bytes',
			thresholdValue: 100,
			yAxisUnit: 'percent',
		});

		// Assert - Validation error should be displayed
		expect(
			screen.getByText(
				/Threshold unit \(bytes\) is not valid in comparison with the column unit \(percent\)/i,
			),
		).toBeInTheDocument();
	});
});
