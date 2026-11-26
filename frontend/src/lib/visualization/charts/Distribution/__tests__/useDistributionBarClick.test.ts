import { StackMode } from 'lib/uPlotV2/config/types';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { renderHook } from 'tests/test-utils';

import { resolveDistributionBars, resolveDistributionXAxis } from '../layout';
import { groupIntoOther } from '../topGroups';
import type { DistributionSeries, UseDistributionBarClickArgs } from '../types';
import { useDistributionBarClick } from '../useDistributionBarClick';

// Buckets ≤ 10, (10, 20], (20, 40], > 40. In (10, 20], `a` stacks 0–5 and Other
// (`b` + `c`) 5–8.
const xAxis = resolveDistributionXAxis([10, 20, 40]);
const series: DistributionSeries[] = [
	{ label: 'a', counts: [0, 5, 0, 0] },
	{ label: 'b', counts: [0, 2, 0, 0] },
	{ label: 'c', counts: [0, 1, 0, 0] },
];
const colors = ['#a', '#b', '#c'];
const drawn = groupIntoOther({
	labels: series.map(({ label }) => label),
	counts: series.map(({ counts }) => counts),
	colors,
	visible: [true, true, true],
	maxGroups: 2,
	otherColor: '#999',
});
const layout = resolveDistributionBars({
	xAxis,
	counts: drawn.counts,
	stack: StackMode.Normal,
	isLogY: false,
});

const clickAt = (xValue: number, yValue: number): ChartClickData => ({
	xValue,
	yValue,
	focusedSeries: null,
	clickedDataTimestamp: 0,
	mouseX: 0,
	mouseY: 0,
	absoluteMouseX: 40,
	absoluteMouseY: 60,
});

describe('useDistributionBarClick', () => {
	it('pins on a click over Other, and only there', () => {
		const { result } = renderHook(() =>
			useDistributionBarClick({ xAxis, layout, drawn, series, colors }),
		);

		expect(result.current.shouldPinOnClick?.(clickAt(1.5, 6.5))).toBe(true);
		expect(result.current.shouldPinOnClick?.(clickAt(1.5, 2))).toBe(false);
	});

	it('drills into a drawn group, never into Other', () => {
		const onBarClick = jest.fn() as jest.MockedFunction<
			NonNullable<UseDistributionBarClickArgs['onBarClick']>
		>;
		const { result } = renderHook(() =>
			useDistributionBarClick({
				xAxis,
				layout,
				drawn,
				series,
				colors,
				onBarClick,
			}),
		);

		result.current.onClick?.(clickAt(1.5, 6.5));
		result.current.onClick?.(clickAt(1.5, 2));

		expect(onBarClick).toHaveBeenCalledTimes(1);
		expect(onBarClick).toHaveBeenCalledWith({
			series: series[0],
			color: '#a',
			coordinates: { x: 40, y: 60 },
		});
	});

	it('pins nothing when no group is summed into Other', () => {
		const { result } = renderHook(() =>
			useDistributionBarClick({
				xAxis,
				layout,
				drawn: { ...drawn, otherSourceIndexes: [] },
				series,
				colors,
			}),
		);

		expect(result.current.shouldPinOnClick).toBeUndefined();
	});

	it('drills into a group picked out of Other, with its own colour', () => {
		const onBarClick = jest.fn() as jest.MockedFunction<
			NonNullable<UseDistributionBarClickArgs['onBarClick']>
		>;
		const { result } = renderHook(() =>
			useDistributionBarClick({
				xAxis,
				layout,
				drawn,
				series,
				colors,
				onBarClick,
			}),
		);

		result.current.onOtherMemberClick?.(2, { x: 5, y: 6 });

		expect(onBarClick).toHaveBeenCalledWith({
			series: series[2],
			color: '#c',
			coordinates: { x: 5, y: 6 },
		});
	});
});
