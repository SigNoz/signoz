import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { preparePieData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/PieChartPanel/prepareData';
import { resolveSeriesLabelV5 } from 'pages/DashboardPage/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { flattenTimeSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import { useLegendSeries } from '../useLegendSeries';

vi.mock('hooks/useDarkMode', () => ({ useIsDarkMode: vi.fn() }));
vi.mock('lib/getLabelName', () => ({ default: vi.fn(() => 'base') }));
vi.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: vi.fn((label: string) => `color:${label}`),
}));
vi.mock('constants/theme', () => ({
	themeColors: { chartcolors: ['dark'], lightModeColor: ['light'] },
}));
vi.mock(
	'pages/DashboardPage/DashboardContainer/Panels/utils/getBuilderQueries',
	() => ({ getBuilderQueries: vi.fn(() => []) }),
);
vi.mock(
	'pages/DashboardPage/DashboardContainer/Panels/utils/resolveSeriesLabel',
	() => ({ resolveSeriesLabelV5: vi.fn() }),
);
vi.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData',
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import('pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData')
		>()),
		flattenTimeSeries: vi.fn(),
		getTimeSeriesResults: vi.fn(() => []),
		getScalarResults: vi.fn(() => []),
	}),
);
vi.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables',
	() => ({ prepareScalarTables: vi.fn(() => []) }),
);
vi.mock(
	'pages/DashboardPage/DashboardContainer/Panels/kinds/PieChartPanel/prepareData',
	() => ({ preparePieData: vi.fn(() => []) }),
);

const mockUseIsDarkMode = useIsDarkMode as unknown as Mock;
const mockFlatten = flattenTimeSeries as unknown as Mock;
const mockResolveLabel = resolveSeriesLabelV5 as unknown as Mock;
const mockGenerateColor = generateColor as unknown as Mock;
const mockPreparePie = preparePieData as unknown as Mock;

const PANEL = {
	kind: 'Panel',
	spec: { plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} }, queries: [] },
} as unknown as DashboardtypesPanelDTO;
const PIE_PANEL = {
	kind: 'Panel',
	spec: { plugin: { kind: 'signoz/PieChartPanel', spec: {} }, queries: [] },
} as unknown as DashboardtypesPanelDTO;
const HISTOGRAM_PANEL = {
	kind: 'Panel',
	spec: { plugin: { kind: 'signoz/HistogramPanel', spec: {} }, queries: [] },
} as unknown as DashboardtypesPanelDTO;
const DATA = { response: {}, legendMap: {} } as unknown as PanelQueryData;

// Each flattened series carries the label resolveSeriesLabelV5 should report.
function seriesWithLabels(labels: string[]): { __label: string }[] {
	return labels.map((__label) => ({ __label }));
}

describe('useLegendSeries', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseIsDarkMode.mockReturnValue(true);
		mockResolveLabel.mockImplementation((s: { __label: string }) => s.__label);
	});

	it('is empty when there are no series', () => {
		mockFlatten.mockReturnValue([]);
		const { result } = renderHook(() => useLegendSeries(PANEL, DATA));
		expect(result.current).toStrictEqual([]);
	});

	it('maps each series to a { label, defaultColor } pair', () => {
		mockFlatten.mockReturnValue(seriesWithLabels(['a', 'b']));
		const { result } = renderHook(() => useLegendSeries(PANEL, DATA));
		expect(result.current).toStrictEqual([
			{ label: 'a', defaultColor: 'color:a' },
			{ label: 'b', defaultColor: 'color:b' },
		]);
	});

	it('dedupes by label, keeping first-seen order', () => {
		mockFlatten.mockReturnValue(seriesWithLabels(['a', 'b', 'a', 'c']));
		const { result } = renderHook(() => useLegendSeries(PANEL, DATA));
		expect(result.current.map((s) => s.label)).toStrictEqual(['a', 'b', 'c']);
		// The duplicate 'a' must not generate a second color.
		expect(
			mockGenerateColor.mock.calls.filter(([label]) => label === 'a'),
		).toHaveLength(1);
	});

	it('skips series that resolve to an empty label', () => {
		mockFlatten.mockReturnValue(seriesWithLabels(['', 'a', '']));
		const { result } = renderHook(() => useLegendSeries(PANEL, DATA));
		expect(result.current).toStrictEqual([
			{ label: 'a', defaultColor: 'color:a' },
		]);
	});

	it('resolves histogram panels via the time-series path', () => {
		mockFlatten.mockReturnValue(seriesWithLabels(['a', 'b']));
		const { result } = renderHook(() => useLegendSeries(HISTOGRAM_PANEL, DATA));
		expect(result.current).toStrictEqual([
			{ label: 'a', defaultColor: 'color:a' },
			{ label: 'b', defaultColor: 'color:b' },
		]);
		// The pie path must not run for a histogram panel.
		expect(mockPreparePie).not.toHaveBeenCalled();
	});

	it('resolves pie panels from their scalar slices, deduped by label', () => {
		mockPreparePie.mockReturnValue([
			{ label: 'x', color: 'c1' },
			{ label: 'y', color: 'c2' },
			{ label: 'x', color: 'c1' },
		]);
		const { result } = renderHook(() => useLegendSeries(PIE_PANEL, DATA));
		expect(result.current).toStrictEqual([
			{ label: 'x', defaultColor: 'c1' },
			{ label: 'y', defaultColor: 'c2' },
		]);
		// The time-series path must not run for a pie panel.
		expect(mockFlatten).not.toHaveBeenCalled();
	});

	it('uses the dark palette in dark mode and the light palette otherwise', () => {
		mockFlatten.mockReturnValue(seriesWithLabels(['a']));

		const dark = renderHook(() => useLegendSeries(PANEL, DATA));
		expect(mockGenerateColor).toHaveBeenLastCalledWith('a', ['dark']);
		dark.unmount();

		mockUseIsDarkMode.mockReturnValue(false);
		renderHook(() => useLegendSeries(PANEL, DATA));
		expect(mockGenerateColor).toHaveBeenLastCalledWith('a', ['light']);
	});
});
