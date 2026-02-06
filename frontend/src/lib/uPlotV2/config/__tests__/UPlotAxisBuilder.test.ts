import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { uPlotXAxisValuesFormat } from 'lib/uPlotLib/utils/constants';
import getGridColor from 'lib/uPlotLib/utils/getGridColor';
import type uPlot from 'uplot';

import type { AxisProps } from '../types';
import { UPlotAxisBuilder } from '../UPlotAxisBuilder';

jest.mock('components/Graph/yAxisConfig', () => ({
	getToolTipValue: jest.fn(),
}));

const createAxisProps = (overrides: Partial<AxisProps> = {}): AxisProps => ({
	scaleKey: 'x',
	label: 'Time',
	isDarkMode: false,
	show: true,
	...overrides,
});

describe('UPlotAxisBuilder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('builds basic axis config with defaults', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				label: 'Time',
			}),
		);

		const config = builder.getConfig();

		expect(config.scale).toBe('x');
		expect(config.label).toBe('Time');
		expect(config.show).toBe(true);
		expect(config.side).toBe(2);
		expect(config.gap).toBe(5);

		// Default grid and ticks are created
		expect(config.grid).toEqual({
			stroke: getGridColor(false),
			width: 0.2,
			show: true,
		});
		expect(config.ticks).toEqual({
			width: 0.3,
			show: true,
		});
	});

	it('merges custom grid config over defaults and respects isDarkMode and isLogScale', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({
				isDarkMode: true,
				isLogScale: true,
				grid: {
					width: 1,
				},
			}),
		);

		const config = builder.getConfig();

		expect(config.grid).toEqual({
			// stroke falls back to theme-based default when not provided
			stroke: getGridColor(true),
			// provided width overrides default
			width: 1,
			// show falls back to default when not provided
			show: true,
		});
	});

	it('uses provided ticks config when present and falls back to defaults otherwise', () => {
		const customTicks = { width: 1, show: false };
		const withTicks = new UPlotAxisBuilder(
			createAxisProps({
				ticks: customTicks,
			}),
		);
		const withoutTicks = new UPlotAxisBuilder(createAxisProps());

		expect(withTicks.getConfig().ticks).toBe(customTicks);
		expect(withoutTicks.getConfig().ticks).toEqual({
			width: 0.3,
			show: true,
		});
	});

	it('uses time-based X-axis values formatter for time-series like panels', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		);

		const config = builder.getConfig();

		expect(config.values).toBe(uPlotXAxisValuesFormat);
	});

	it('does not attach X-axis datetime formatter when panel type is not supported', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				panelType: PANEL_TYPES.LIST, // not in PANEL_TYPES_WITH_X_AXIS_DATETIME_FORMAT
			}),
		);

		const config = builder.getConfig();

		expect(config.values).toBeUndefined();
	});

	it('builds Y-axis values formatter that delegates to getToolTipValue', () => {
		const yBuilder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'y',
				yAxisUnit: 'ms',
				decimalPrecision: 3,
			}),
		);

		const config = yBuilder.getConfig();
		expect(typeof config.values).toBe('function');

		(getToolTipValue as jest.Mock).mockImplementation(
			(value: string, unit?: string, precision?: unknown) =>
				`formatted:${value}:${unit}:${precision}`,
		);

		// Simulate uPlot calling the values formatter
		const valuesFn = (config.values as unknown) as (
			self: uPlot,
			vals: unknown[],
		) => string[];
		const result = valuesFn({} as uPlot, [1, null, 2, Number.NaN]);

		expect(getToolTipValue).toHaveBeenCalledTimes(2);
		expect(getToolTipValue).toHaveBeenNthCalledWith(1, '1', 'ms', 3);
		expect(getToolTipValue).toHaveBeenNthCalledWith(2, '2', 'ms', 3);

		// Null/NaN values should map to empty strings
		expect(result).toEqual(['formatted:1:ms:3', '', 'formatted:2:ms:3', '']);
	});

	it('adds dynamic size calculator only for Y-axis when size is not provided', () => {
		const yBuilder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'y',
			}),
		);
		const xBuilder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
			}),
		);

		const yConfig = yBuilder.getConfig();
		const xConfig = xBuilder.getConfig();

		expect(typeof yConfig.size).toBe('function');
		expect(xConfig.size).toBeUndefined();
	});

	it('uses explicit size function when provided', () => {
		const sizeFn: uPlot.Axis.Size = jest.fn(() => 100) as uPlot.Axis.Size;

		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'y',
				size: sizeFn,
			}),
		);

		const config = builder.getConfig();
		expect(config.size).toBe(sizeFn);
	});

	it('builds stroke color based on stroke and isDarkMode', () => {
		const explicitStroke = new UPlotAxisBuilder(
			createAxisProps({
				stroke: '#ff0000',
			}),
		);
		const darkStroke = new UPlotAxisBuilder(
			createAxisProps({
				stroke: undefined,
				isDarkMode: true,
			}),
		);
		const lightStroke = new UPlotAxisBuilder(
			createAxisProps({
				stroke: undefined,
				isDarkMode: false,
			}),
		);

		expect(explicitStroke.getConfig().stroke).toBe('#ff0000');
		expect(darkStroke.getConfig().stroke).toBe('white');
		expect(lightStroke.getConfig().stroke).toBe('black');
	});
});
