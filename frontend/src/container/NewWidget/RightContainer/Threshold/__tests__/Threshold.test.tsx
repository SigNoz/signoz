/* eslint-disable react/jsx-props-no-spreading */
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Y_AXIS_UNIT_NAMES } from 'components/YAxisUnitSelector/constants';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { render, screen } from 'tests/test-utils';

import Threshold from '../Threshold';

// Mock the getColumnUnit function
jest.mock('lib/query/createTableColumnsFromQuery', () => ({
	getColumnUnit: jest.fn(
		(option: string, columnUnits: Record<string, string>) =>
			columnUnits[option] || 'percent',
	),
}));

// Mock the unitOptions function to return YAxisCategory-shaped data
jest.mock('container/NewWidget/utils', () => ({
	unitOptions: jest.fn(() => [
		{
			name: 'Mock Category',
			units: [
				{
					id: UniversalYAxisUnit.NONE,
					name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.NONE],
				},
				{
					id: UniversalYAxisUnit.PERCENT,
					name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PERCENT],
				},
				{
					id: UniversalYAxisUnit.MILLISECONDS,
					name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MILLISECONDS],
				},
			],
		},
	]),
}));

const defaultProps = {
	index: 'test-threshold-1',
	keyIndex: 0,
	thresholdOperator: '>' as const,
	thresholdValue: 50,
	thresholdUnit: UniversalYAxisUnit.NONE,
	thresholdColor: 'Red',
	thresholdFormat: 'Text' as const,
	isEditEnabled: true,
	selectedGraph: PANEL_TYPES.TABLE,
	tableOptions: [
		{ value: 'cpu_usage', label: 'CPU Usage' },
		{ value: 'memory_usage', label: 'Memory Usage' },
	],
	thresholdTableOptions: 'cpu_usage',
	columnUnits: {
		cpu_usage: UniversalYAxisUnit.PERCENT,
		memory_usage: UniversalYAxisUnit.BYTES,
	},
	yAxisUnit: UniversalYAxisUnit.PERCENT,
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
			thresholdUnit: UniversalYAxisUnit.MILLISECONDS,
			thresholdValue: 50,
		});

		const errorMessage = screen.getByTestId('invalid-unit-comparison');
		// Assert - Validation error should be displayed
		expect(errorMessage.textContent).toBe(
			`Threshold unit (${UniversalYAxisUnit.MILLISECONDS}) is not valid in comparison with the column unit (${UniversalYAxisUnit.PERCENT})`,
		);
	});

	it('should not show validation error when threshold unit matches column unit', () => {
		// Act - Render component with matching units
		renderThreshold({
			thresholdUnit: UniversalYAxisUnit.PERCENT,
			thresholdValue: 50,
		});

		// Assert - No validation error should be displayed
		expect(
			screen.queryByTestId('invalid-unit-comparison'),
		).not.toBeInTheDocument();
	});

	it('should show validation error for time series graph when units are incompatible', () => {
		// Act - Render component for time series with incompatible units
		renderThreshold({
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdUnit: UniversalYAxisUnit.MILLISECONDS,
			thresholdValue: 100,
			yAxisUnit: UniversalYAxisUnit.PERCENT,
		});

		const errorMessage = screen.getByTestId('invalid-unit-comparison');
		// Assert - Validation error should be displayed
		expect(errorMessage.textContent).toBe(
			`Threshold unit (${UniversalYAxisUnit.MILLISECONDS}) is not valid in comparison with the y-axis unit (${UniversalYAxisUnit.PERCENT})`,
		);
	});

	it('should not show validation error for time series graph when threshold unit is "none"', () => {
		// Act - Render component for time series with "none" threshold unit
		renderThreshold({
			selectedGraph: PANEL_TYPES.TIME_SERIES,
			thresholdUnit: 'none',
			thresholdValue: 100,
			yAxisUnit: UniversalYAxisUnit.PERCENT,
		});
		expect(
			screen.queryByTestId('invalid-unit-comparison'),
		).not.toBeInTheDocument();
	});

	it('should not show validation error when threshold unit is compatible with column unit', () => {
		// Act - Render component with compatible units (both in same category - Time)
		renderThreshold({
			thresholdUnit: UniversalYAxisUnit.SECONDS,
			thresholdValue: 100,
			columnUnits: { cpu_usage: UniversalYAxisUnit.MILLISECONDS },
			thresholdTableOptions: 'cpu_usage',
		});
		// Assert - No validation error should be displayed
		expect(
			screen.queryByTestId('invalid-unit-comparison'),
		).not.toBeInTheDocument();
	});

	it('should show validation error when threshold unit is in different category than column unit', () => {
		// Act - Render component with units from different categories
		renderThreshold({
			thresholdUnit: UniversalYAxisUnit.BYTES,
			thresholdValue: 100,
			yAxisUnit: UniversalYAxisUnit.PERCENT,
		});

		const errorMessage = screen.getByTestId('invalid-unit-comparison');
		// Assert - Validation error should be displayed
		expect(errorMessage.textContent).toBe(
			`Threshold unit (${UniversalYAxisUnit.BYTES}) is not valid in comparison with the column unit (${UniversalYAxisUnit.PERCENT})`,
		);
	});
});
