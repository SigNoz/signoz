import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { uPlotXAxisValuesFormat } from 'lib/uPlotLib/utils/constants';
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
			stroke: 'rgba(0,0,0,0.5)',
			width: 0.2,
			show: true,
		});
		expect(config.ticks).toEqual({
			width: 0.3,
			show: true,
		});
	});

	it('sets config values when provided', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				label: 'Time',
				show: false,
				side: 0,
				gap: 10,
				grid: {
					stroke: '#ff0000',
					width: 1,
					show: false,
				},
				ticks: {
					stroke: '#00ff00',
					width: 1,
					show: false,
					size: 10,
				},
				values: ['1', '2', '3'],
				space: 20,
				size: 100,
				stroke: '#0000ff',
			}),
		);
		const config = builder.getConfig();
		expect(config.scale).toBe('x');
		expect(config.label).toBe('Time');
		expect(config.show).toBe(false);
		expect(config.gap).toBe(10);
		expect(config.grid).toEqual({
			stroke: '#ff0000',
			width: 1,
			show: false,
		});
		expect(config.ticks).toEqual({
			stroke: '#00ff00',
			width: 1,
			show: false,
			size: 10,
		});
		expect(config.values).toEqual(['1', '2', '3']);
		expect(config.space).toBe(20);
		expect(config.size).toBe(100);
		expect(config.stroke).toBe('#0000ff');
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
			stroke: 'rgba(231,233,237,0.3)',
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

	it('uses explicit values formatter when provided', () => {
		const customValues: uPlot.Axis.Values = jest.fn(() => ['a', 'b', 'c']);

		const builder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'y',
				values: customValues,
			}),
		);

		const config = builder.getConfig();

		expect(config.values).toBe(customValues);
	});

	it('returns undefined values for scaleKey neither x nor y', () => {
		const builder = new UPlotAxisBuilder(createAxisProps({ scaleKey: 'custom' }));

		const config = builder.getConfig();

		expect(config.values).toBeUndefined();
	});

	it('includes space in config when provided', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({ scaleKey: 'y', space: 50 }),
		);

		const config = builder.getConfig();

		expect(config.space).toBe(50);
	});

	it('includes PANEL_TYPES.BAR and PANEL_TYPES.TIME_SERIES in X-axis datetime formatter', () => {
		const barBuilder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				panelType: PANEL_TYPES.BAR,
			}),
		);
		expect(barBuilder.getConfig().values).toBe(uPlotXAxisValuesFormat);

		const timeSeriesBuilder = new UPlotAxisBuilder(
			createAxisProps({
				scaleKey: 'x',
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		);
		expect(timeSeriesBuilder.getConfig().values).toBe(uPlotXAxisValuesFormat);
	});

	it('should return the existing size when cycleNum > 1', () => {
		const builder = new UPlotAxisBuilder(createAxisProps({ scaleKey: 'y' }));

		const config = builder.getConfig();
		const sizeFn = config.size;
		expect(typeof sizeFn).toBe('function');

		const mockAxis = {
			_size: 80,
			ticks: { size: 10 },
			font: ['12px sans-serif'],
		};
		const mockSelf = ({
			axes: [mockAxis],
			ctx: { measureText: jest.fn(() => ({ width: 60 })), font: '' },
		} as unknown) as uPlot;

		const result = (sizeFn as (
			s: uPlot,
			v: string[],
			a: number,
			c: number,
		) => number)(
			mockSelf,
			['100', '200'],
			0,
			2, // cycleNum > 1
		);

		expect(result).toBe(80);
	});

	it('should invoke the size calculator and compute from text width when cycleNum <= 1', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({ scaleKey: 'y', gap: 8 }),
		);

		const config = builder.getConfig();
		const sizeFn = config.size;
		expect(typeof sizeFn).toBe('function');

		const mockAxis = {
			ticks: { size: 12 },
			font: ['12px sans-serif'],
		};
		const measureText = jest.fn(() => ({ width: 48 }));
		const mockSelf = ({
			axes: [mockAxis],
			ctx: {
				measureText,
				get font() {
					return '';
				},
				set font(_v: string) {
					/* noop */
				},
			},
		} as unknown) as uPlot;

		const result = (sizeFn as (
			s: uPlot,
			v: string[],
			a: number,
			c: number,
		) => number)(
			mockSelf,
			['10', '2000ms'],
			0,
			0, // cycleNum <= 1
		);

		expect(measureText).toHaveBeenCalledWith('2000ms');
		expect(result).toBeGreaterThanOrEqual(12 + 8);
	});

	it('merge updates axis props', () => {
		const builder = new UPlotAxisBuilder(
			createAxisProps({ scaleKey: 'y', label: 'Original' }),
		);

		builder.merge({ label: 'Merged', yAxisUnit: 'bytes' });

		const config = builder.getConfig();

		expect(config.label).toBe('Merged');
		expect(config.values).toBeDefined();
	});
});
