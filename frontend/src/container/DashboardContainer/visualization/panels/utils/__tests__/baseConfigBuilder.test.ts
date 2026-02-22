import { PANEL_TYPES } from 'constants/queryBuilder';
import { STEP_INTERVAL_MULTIPLIER } from 'lib/uPlotV2/constants';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { PanelMode } from '../../types';
import { buildBaseConfig } from '../baseConfigBuilder';

jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		getStoredSeriesVisibility: jest.fn(),
	}),
);

jest.mock('lib/uPlotV2/utils', () => ({
	calculateWidthBasedOnStepInterval: jest.fn(),
}));

const calculateWidthBasedOnStepIntervalMock = jest.requireMock(
	'lib/uPlotV2/utils',
).calculateWidthBasedOnStepInterval as jest.Mock;

jest.mock('lib/uPlotLib/plugins/onClickPlugin', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({ name: 'onClickPlugin' }),
}));

const createWidget = (overrides: Partial<Widgets> = {}): Widgets =>
	({
		id: 'widget-1',
		yAxisUnit: 'ms',
		isLogScale: false,
		softMin: undefined,
		softMax: undefined,
		thresholds: [],
		...overrides,
	} as Widgets);

const createApiResponse = (
	overrides: Partial<MetricRangePayloadProps> = {},
): MetricRangePayloadProps =>
	({
		data: { result: [], resultType: 'matrix', newResult: null },
		...overrides,
	} as MetricRangePayloadProps);

const baseProps = {
	widget: createWidget(),
	apiResponse: createApiResponse(),
	isDarkMode: true,
	panelMode: PanelMode.DASHBOARD_VIEW,
	panelType: PANEL_TYPES.TIME_SERIES,
};

describe('buildBaseConfig', () => {
	it('returns a UPlotConfigBuilder instance', () => {
		const builder = buildBaseConfig(baseProps);

		expect(builder).toBeDefined();
		expect(typeof builder.getConfig).toBe('function');
		expect(typeof builder.getLegendItems).toBe('function');
	});

	it('configures builder with widgetId and DASHBOARD_VIEW preferences', () => {
		const builder = buildBaseConfig({
			...baseProps,
			panelMode: PanelMode.DASHBOARD_VIEW,
			widget: createWidget({ id: 'my-widget' }),
		});

		expect(builder.getWidgetId()).toBe('my-widget');
		expect(builder.getShouldSaveSelectionPreference()).toBe(true);
	});

	it('configures builder with IN_MEMORY selection when panelMode is DASHBOARD_EDIT', () => {
		const builder = buildBaseConfig({
			...baseProps,
			panelMode: PanelMode.DASHBOARD_EDIT,
		});

		expect(builder.getShouldSaveSelectionPreference()).toBe(false);
		const config = builder.getConfig();
		expect(config.series).toBeDefined();
	});

	it('passes stepInterval to builder and cursor prox uses width * multiplier', () => {
		const stepInterval = 60;
		const mockWidth = 100;
		calculateWidthBasedOnStepIntervalMock.mockReturnValue(mockWidth);

		const builder = buildBaseConfig({
			...baseProps,
			stepInterval,
		});

		const config = builder.getConfig();
		const prox = config.cursor?.hover?.prox;
		expect(typeof prox).toBe('function');

		const uPlotInstance = {} as uPlot;
		const proxResult = (prox as (u: uPlot) => number)(uPlotInstance);

		expect(calculateWidthBasedOnStepIntervalMock).toHaveBeenCalledWith({
			uPlotInstance,
			stepInterval,
		});
		expect(proxResult).toBe(mockWidth * STEP_INTERVAL_MULTIPLIER);
	});

	it('adds x scale with time config and min/max when provided', () => {
		const builder = buildBaseConfig({
			...baseProps,
			minTimeScale: 1000,
			maxTimeScale: 2000,
		});

		const config = builder.getConfig();
		expect(config.scales?.x).toBeDefined();
		expect(config.scales?.x?.time).toBe(true);
		const range = config.scales?.x?.range;
		expect(Array.isArray(range)).toBe(true);
		expect((range as [number, number])[0]).toBe(1000);
	});

	it('configures log scale on y axis when widget.isLogScale is true', () => {
		const builder = buildBaseConfig({
			...baseProps,
			widget: createWidget({ isLogScale: true }),
		});

		const config = builder.getConfig();
		expect(config.scales?.y).toBeDefined();
		expect(config.scales?.y?.log).toBe(10);
	});

	it('adds onClick plugin when onClick is a function', () => {
		const onClickPlugin = jest.requireMock('lib/uPlotLib/plugins/onClickPlugin')
			.default;
		const onClick = jest.fn();

		buildBaseConfig({
			...baseProps,
			onClick,
			apiResponse: createApiResponse(),
		});

		expect(onClickPlugin).toHaveBeenCalledWith({
			onClick,
			apiResponse: expect.any(Object),
		});
	});

	it('does not add onClick plugin when onClick is not a function', () => {
		const onClickPlugin = jest.requireMock('lib/uPlotLib/plugins/onClickPlugin')
			.default;

		const builder = buildBaseConfig({
			...baseProps,
		});

		const config = builder.getConfig();
		const plugins = config.plugins ?? [];
		expect(
			plugins.some((p) => (p as { name?: string }).name === 'onClickPlugin'),
		).toBe(false);
		expect(onClickPlugin).not.toHaveBeenCalled();
	});

	it('adds thresholds from widget', () => {
		const builder = buildBaseConfig({
			...baseProps,
			widget: createWidget({
				thresholds: [
					{
						thresholdValue: 80,
						thresholdColor: '#ff0000',
						thresholdUnit: 'ms',
						thresholdLabel: 'High',
					},
				] as Widgets['thresholds'],
			}),
		});

		const config = builder.getConfig();
		const drawHooks = config.hooks?.draw ?? [];
		expect(drawHooks.length).toBeGreaterThan(0);
	});

	it('adds x and y axes with correct scaleKeys and panelType', () => {
		const builder = buildBaseConfig(baseProps);

		const config = builder.getConfig();
		expect(config.axes).toHaveLength(2);
		expect(config.axes?.[0].scale).toBe('x');
		expect(config.axes?.[1].scale).toBe('y');
	});

	it('sets tzDate when timezone is provided', () => {
		const builder = buildBaseConfig({
			...baseProps,
			timezone: {
				name: 'America/New_York',
				value: 'America/New_York',
				offset: 'UTC-5',
				searchIndex: 'America/New_York',
			},
		});

		const config = builder.getConfig();
		expect(config.tzDate).toBeDefined();
		expect(typeof config.tzDate).toBe('function');
	});

	it('leaves tzDate undefined when timezone is not provided', () => {
		const builder = buildBaseConfig(baseProps);

		const config = builder.getConfig();
		expect(config.tzDate).toBeUndefined();
	});

	it('register setSelect hook when onDragSelect is provided', () => {
		const onDragSelect = jest.fn();
		const builder = buildBaseConfig({
			...baseProps,
			onDragSelect,
		});

		const config = builder.getConfig();
		expect(config.hooks?.setSelect).toBeDefined();
	});
});
