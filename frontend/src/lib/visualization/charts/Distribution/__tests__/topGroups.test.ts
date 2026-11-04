import { StackMode } from 'lib/uPlotV2/config/types';

import { resolveDistributionXAxis } from '../layout';
import {
	groupIntoOther,
	MAX_STACKED_GROUPS,
	OTHER_GROUP_LABEL,
	resolveMaxDrawnGroups,
} from '../topGroups';
import { DistributionXScale } from '../types';

describe('resolveMaxDrawnGroups', () => {
	// Four equal buckets plus underflow and overflow: six slots of one unit each.
	const xAxis = resolveDistributionXAxis(
		[1, 2, 3, 4, 5],
		DistributionXScale.Ordinal,
	);

	it('caps stacked and percent at the fixed limit', () => {
		expect(
			resolveMaxDrawnGroups({ stack: StackMode.Normal, xAxis, plotWidth: 60 }),
		).toBe(MAX_STACKED_GROUPS);
		expect(
			resolveMaxDrawnGroups({ stack: StackMode.Percent, xAxis, plotWidth: 60 }),
		).toBe(MAX_STACKED_GROUPS);
	});

	it('fits side by side so the narrowest bar stays 3 px wide', () => {
		// 120 px over six slots: 20 px a bucket, six 3 px bars.
		expect(
			resolveMaxDrawnGroups({ stack: StackMode.None, xAxis, plotWidth: 120 }),
		).toBe(6);
		expect(
			resolveMaxDrawnGroups({ stack: StackMode.None, xAxis, plotWidth: 6 }),
		).toBe(1);
	});
});

describe('groupIntoOther', () => {
	const args = {
		labels: ['a', 'b', 'c', 'd'],
		counts: [
			[1, 1],
			[5, 5],
			[2, 0],
			[3, 3],
		],
		colors: ['#a', '#b', '#c', '#d'],
		visible: [true, true, true, true],
		otherColor: '#999',
	};

	it('draws every visible group when they fit', () => {
		const drawn = groupIntoOther({ ...args, maxGroups: 4 });

		expect(drawn.labels).toStrictEqual(['a', 'b', 'c', 'd']);
		expect(drawn.otherGroupCount).toBe(0);
	});

	it('keeps the largest, in legend order, and sums the rest exactly', () => {
		const drawn = groupIntoOther({ ...args, maxGroups: 3 });

		expect(drawn.labels).toStrictEqual(['b', 'd', OTHER_GROUP_LABEL]);
		expect(drawn.counts[2]).toStrictEqual([3, 1]);
		expect(drawn.colors[2]).toBe('#999');
		expect(drawn).toMatchObject({ otherGroupCount: 2, visibleGroupCount: 4 });
	});

	it('re-ranks without hidden groups, which never reach Other', () => {
		const drawn = groupIntoOther({
			...args,
			visible: [true, false, true, true],
			maxGroups: 2,
		});

		expect(drawn.labels).toStrictEqual(['d', OTHER_GROUP_LABEL]);
		expect(drawn.counts[1]).toStrictEqual([3, 1]);
		expect(drawn.visibleGroupCount).toBe(3);
	});
});
