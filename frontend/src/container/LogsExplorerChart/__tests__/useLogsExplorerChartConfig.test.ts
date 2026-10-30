import { renderHook } from '@testing-library/react';
import { StackMode } from 'lib/uPlotV2/config/types';
import { QueryData } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import { useLogsExplorerChartConfig } from '../useLogsExplorerChartConfig';

// Exercise the real range calculation instead of the global canvas mock.
jest.mock('uplot', () => {
	jest.spyOn(window, 'matchMedia').mockImplementation((media) => ({
		matches: false,
		media,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	}));
	return jest.requireActual('uplot/dist/uPlot.cjs.js');
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => true,
}));

jest.mock('providers/Timezone', () => ({
	useTimezone: (): { timezone: { value: string } } => ({
		timezone: { value: 'UTC' },
	}),
}));

describe.each([
	{ isLogsExplorerViews: false, stack: StackMode.None },
	{ isLogsExplorerViews: true, stack: StackMode.Normal },
])('logs frequency scale (stack: $stack)', ({ isLogsExplorerViews, stack }) => {
	it.each([
		{ min: 100, max: 120 },
		{ min: 100, max: 100 },
		{ min: 0, max: 0 },
		{ min: 0, max: 120 },
	])('starts at zero for counts between $min and $max', ({ min, max }) => {
		const data: QueryData[] = [
			{
				metric: { severity_text: 'INFO' },
				queryName: 'A',
				values: [
					[1_700_000_000, String(min)],
					[1_700_000_060, String(max)],
				],
			},
		];
		const { result } = renderHook(() =>
			useLogsExplorerChartConfig({
				data,
				isLogsExplorerViews,
				onDragSelect: jest.fn(),
				minTimeScale: 1_700_000_000,
				maxTimeScale: 1_700_000_060,
			}),
		);
		result.current.config.setStackMode(stack);
		const config = result.current.config.getConfig();
		const range = config.scales?.y?.range as uPlot.Scale.Range;

		expect(typeof range).toBe('function');
		const [axisMin, axisMax] = (range as uPlot.Range.Function)(
			{ scales: config.scales } as uPlot,
			min,
			max,
			'y',
		);

		expect(axisMin).toBe(0);
		expect(axisMax).toBeGreaterThan(max);
		expect(config.scales?.y?.auto).toBe(true);
		expect(config.scales?.x?.range).toStrictEqual([1_700_000_000, 1_700_000_060]);
	});
});
