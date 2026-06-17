import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { flattenTimeSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import { useLegendSeries } from '../useLegendSeries';

jest.mock('hooks/useDarkMode', () => ({ useIsDarkMode: jest.fn() }));
jest.mock('lib/getLabelName', () => jest.fn(() => 'base'));
jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: jest.fn((label: string) => `color:${label}`),
}));
jest.mock('constants/theme', () => ({
	themeColors: { chartcolors: ['dark'], lightModeColor: ['light'] },
}));
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries',
	() => ({ getBuilderQueries: jest.fn(() => []) }),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel',
	() => ({ resolveSeriesLabelV5: jest.fn() }),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData',
	() => ({
		flattenTimeSeries: jest.fn(),
		getTimeSeriesResults: jest.fn(() => []),
	}),
);

const mockUseIsDarkMode = useIsDarkMode as unknown as jest.Mock;
const mockFlatten = flattenTimeSeries as unknown as jest.Mock;
const mockResolveLabel = resolveSeriesLabelV5 as unknown as jest.Mock;
const mockGenerateColor = generateColor as unknown as jest.Mock;

const PANEL = {
	kind: 'Panel',
	spec: { plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} }, queries: [] },
} as unknown as DashboardtypesPanelDTO;
const DATA = { response: {}, legendMap: {} } as unknown as PanelQueryData;

// Each flattened series carries the label resolveSeriesLabelV5 should report.
function seriesWithLabels(labels: string[]): { __label: string }[] {
	return labels.map((__label) => ({ __label }));
}

describe('useLegendSeries', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
