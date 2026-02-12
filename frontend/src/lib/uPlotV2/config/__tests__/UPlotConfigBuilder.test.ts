import { PANEL_TYPES } from 'constants/queryBuilder';
import uPlot from 'uplot';

import type { SeriesProps } from '../types';
import { DrawStyle, SelectionPreferencesSource } from '../types';
import { UPlotConfigBuilder } from '../UPlotConfigBuilder';

// Mock only the real boundary that hits localStorage
jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		getStoredSeriesVisibility: jest.fn(),
	}),
);

const getStoredSeriesVisibilityMock = jest.requireMock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
) as {
	getStoredSeriesVisibility: jest.Mock;
};

describe('UPlotConfigBuilder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const createSeriesProps = (
		overrides: Partial<SeriesProps> = {},
	): SeriesProps => ({
		scaleKey: 'y',
		label: 'Requests',
		colorMapping: {},
		drawStyle: DrawStyle.Line,
		panelType: PANEL_TYPES.TIME_SERIES,
		...overrides,
	});

	it('returns correct save selection preference flag from constructor args', () => {
		const builder = new UPlotConfigBuilder({
			shouldSaveSelectionPreference: true,
		});

		expect(builder.getShouldSaveSelectionPreference()).toBe(true);
	});

	it('returns widgetId from constructor args', () => {
		const builder = new UPlotConfigBuilder({ widgetId: 'widget-123' });

		expect(builder.getWidgetId()).toBe('widget-123');
	});

	it('sets tzDate from constructor and includes it in config', () => {
		const tzDate = (ts: number): Date => new Date(ts);
		const builder = new UPlotConfigBuilder({ tzDate });

		const config = builder.getConfig();

		expect(config.tzDate).toBe(tzDate);
	});

	it('does not call onDragSelect for click without drag (width === 0)', () => {
		const onDragSelect = jest.fn();
		const builder = new UPlotConfigBuilder({ onDragSelect });

		const config = builder.getConfig();
		const setSelectHooks = config.hooks?.setSelect ?? [];
		expect(setSelectHooks.length).toBe(1);

		const uplotInstance = ({
			select: { left: 10, width: 0 },
			posToVal: jest.fn(),
		} as unknown) as uPlot;

		// Simulate uPlot calling the hook
		const setSelectHook = setSelectHooks[0];
		setSelectHook!(uplotInstance);

		expect(onDragSelect).not.toHaveBeenCalled();
	});

	it('calls onDragSelect with start and end times in milliseconds for a drag selection', () => {
		const onDragSelect = jest.fn();
		const builder = new UPlotConfigBuilder({ onDragSelect });

		const config = builder.getConfig();
		const setSelectHooks = config.hooks?.setSelect ?? [];
		expect(setSelectHooks.length).toBe(1);

		const posToVal = jest
			.fn()
			// left position
			.mockReturnValueOnce(100)
			// left + width
			.mockReturnValueOnce(110);

		const uplotInstance = ({
			select: { left: 50, width: 20 },
			posToVal,
		} as unknown) as uPlot;

		const setSelectHook = setSelectHooks[0];
		setSelectHook!(uplotInstance);

		expect(onDragSelect).toHaveBeenCalledTimes(1);
		// 100 and 110 seconds converted to milliseconds
		expect(onDragSelect).toHaveBeenCalledWith(100_000, 110_000);
	});

	it('adds and removes hooks via addHook, and exposes them through getConfig', () => {
		const builder = new UPlotConfigBuilder();
		const drawHook = jest.fn();

		const remove = builder.addHook('draw', drawHook as uPlot.Hooks.Defs['draw']);

		let config = builder.getConfig();
		expect(config.hooks?.draw).toContain(drawHook);

		// Remove and ensure it no longer appears in config
		remove();
		config = builder.getConfig();
		expect(config.hooks?.draw ?? []).not.toContain(drawHook);
	});

	it('adds axes, scales, and series and wires them into the final config', () => {
		const builder = new UPlotConfigBuilder();

		// Add axis and scale
		builder.addAxis({ scaleKey: 'y', label: 'Requests' });
		builder.addScale({ scaleKey: 'y' });

		// Add two series – legend indices should start from 1 (0 is the timestamp series)
		builder.addSeries(createSeriesProps({ label: 'Requests' }));
		builder.addSeries(createSeriesProps({ label: 'Errors' }));

		const config = builder.getConfig();

		// Axes
		expect(config.axes).toHaveLength(1);
		expect(config.axes?.[0].scale).toBe('y');

		// Scales are returned as an object keyed by scaleKey
		expect(config.scales).toBeDefined();
		expect(Object.keys(config.scales ?? {})).toContain('y');

		// Series: base timestamp + 2 data series
		expect(config.series).toHaveLength(3);
		// Base series (index 0) has a value formatter that returns empty string
		const baseSeries = config.series?.[0] as { value?: () => string };
		expect(typeof baseSeries?.value).toBe('function');
		expect(baseSeries?.value?.()).toBe('');

		// Legend items align with series and carry label and color from series config
		const legendItems = builder.getLegendItems();
		expect(Object.keys(legendItems)).toEqual(['1', '2']);
		expect(legendItems[1].seriesIndex).toBe(1);
		expect(legendItems[1].label).toBe('Requests');
		expect(legendItems[2].label).toBe('Errors');
	});

	it('merges axis when addAxis is called twice with same scaleKey', () => {
		const builder = new UPlotConfigBuilder();

		builder.addAxis({ scaleKey: 'y', label: 'Requests' });
		builder.addAxis({ scaleKey: 'y', label: 'Updated Label', show: false });

		const config = builder.getConfig();

		expect(config.axes).toHaveLength(1);
		expect(config.axes?.[0].label).toBe('Updated Label');
		expect(config.axes?.[0].show).toBe(false);
	});

	it('merges scale when addScale is called twice with same scaleKey', () => {
		const builder = new UPlotConfigBuilder();

		builder.addScale({ scaleKey: 'y', min: 0 });
		builder.addScale({ scaleKey: 'y', max: 100 });

		const config = builder.getConfig();

		// Only one scale entry for 'y' (merge path used, no duplicate added)
		expect(config.scales).toBeDefined();
		const scales = config.scales ?? {};
		expect(Object.keys(scales)).toEqual(['y']);
		expect(scales.y?.range).toBeDefined();
	});

	it('restores visibility state from localStorage when selectionPreferencesSource is LOCAL_STORAGE', () => {
		// Index 0 = x-axis/time; indices 1,2 = data series (Requests, Errors)
		const visibility = [true, true, false];

		getStoredSeriesVisibilityMock.getStoredSeriesVisibility.mockReturnValue(
			visibility,
		);

		const builder = new UPlotConfigBuilder({
			widgetId: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.LOCAL_STORAGE,
		});

		builder.addSeries(createSeriesProps({ label: 'Requests' }));
		builder.addSeries(createSeriesProps({ label: 'Errors' }));

		const legendItems = builder.getLegendItems();

		// When any series is hidden, legend visibility is driven by the stored map
		expect(legendItems[1].show).toBe(true);
		expect(legendItems[2].show).toBe(false);

		const config = builder.getConfig();
		const [, firstSeries, secondSeries] = config.series ?? [];

		expect(firstSeries?.show).toBe(true);
		expect(secondSeries?.show).toBe(false);
	});

	it('does not attempt to read stored visibility when using in-memory preferences', () => {
		const builder = new UPlotConfigBuilder({
			widgetId: 'widget-1',
			selectionPreferencesSource: SelectionPreferencesSource.IN_MEMORY,
		});

		builder.addSeries(createSeriesProps({ label: 'Requests' }));

		builder.getLegendItems();
		builder.getConfig();

		expect(
			getStoredSeriesVisibilityMock.getStoredSeriesVisibility,
		).not.toHaveBeenCalled();
	});

	it('adds thresholds only once per scale key', () => {
		const builder = new UPlotConfigBuilder();

		const thresholdsOptions = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 100 }],
		};

		builder.addThresholds(thresholdsOptions);
		builder.addThresholds(thresholdsOptions);

		const config = builder.getConfig();
		const drawHooks = config.hooks?.draw ?? [];

		// Only a single draw hook should be registered for the same scaleKey
		expect(drawHooks.length).toBe(1);
	});

	it('adds multiple thresholds when scale key is different', () => {
		const builder = new UPlotConfigBuilder();

		const thresholdsOptions = {
			scaleKey: 'y',
			thresholds: [{ thresholdValue: 100 }],
		};
		builder.addThresholds(thresholdsOptions);
		const thresholdsOptions2 = {
			scaleKey: 'y2',
			thresholds: [{ thresholdValue: 200 }],
		};
		builder.addThresholds(thresholdsOptions2);

		const config = builder.getConfig();
		const drawHooks = config.hooks?.draw ?? [];

		// Two draw hooks should be registered for different scaleKeys
		expect(drawHooks.length).toBe(2);
	});

	it('merges cursor configuration with defaults instead of replacing them', () => {
		const builder = new UPlotConfigBuilder();

		builder.setCursor({
			drag: { setScale: false },
		});

		const config = builder.getConfig();

		expect(config.cursor?.drag?.setScale).toBe(false);
		// Points configuration from DEFAULT_CURSOR_CONFIG should still be present
		expect(config.cursor?.points).toBeDefined();
	});

	it('adds plugins and includes them in config', () => {
		const builder = new UPlotConfigBuilder();
		const plugin: uPlot.Plugin = {
			opts: (): void => {},
			hooks: {},
		};

		builder.addPlugin(plugin);

		const config = builder.getConfig();

		expect(config.plugins).toContain(plugin);
	});

	it('sets padding, legend, focus, select, tzDate, bands and includes them in config', () => {
		const tzDate = (ts: number): Date => new Date(ts);
		const builder = new UPlotConfigBuilder();

		const bands: uPlot.Band[] = [{ series: [1, 2], fill: (): string => '#000' }];

		builder.setBands(bands);
		builder.setPadding([10, 20, 30, 40]);
		builder.setLegend({ show: true, live: true });
		builder.setFocus({ alpha: 0.5 });
		builder.setSelect({ left: 0, width: 0, top: 0, height: 0 });
		builder.setTzDate(tzDate);

		const config = builder.getConfig();

		expect(config.bands).toEqual(bands);
		expect(config.padding).toEqual([10, 20, 30, 40]);
		expect(config.legend).toEqual({ show: true, live: true });
		expect(config.focus).toEqual({ alpha: 0.5 });
		expect(config.select).toEqual({ left: 0, width: 0, top: 0, height: 0 });
		expect(config.tzDate).toBe(tzDate);
	});

	it('does not include plugins when none added', () => {
		const builder = new UPlotConfigBuilder();

		const config = builder.getConfig();

		expect(config.plugins).toBeUndefined();
	});

	it('does not include bands when empty', () => {
		const builder = new UPlotConfigBuilder();

		const config = builder.getConfig();

		expect(config.bands).toBeUndefined();
	});
});
