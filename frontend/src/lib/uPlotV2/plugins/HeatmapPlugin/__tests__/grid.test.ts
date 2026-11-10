import { resolveHeatmapGrid } from '../grid';
import { HeatmapSeries } from '../types';

const BUCKETS = [10, 20];
const STEP = 60;

/** Two groups over two columns, each missing a value the other reports. */
const TWO_GROUPS: HeatmapSeries[] = [
	{
		label: 'cart',
		points: [
			{ timestamp: 60, counts: [1, 2, 3] },
			{ timestamp: 120, counts: [null, 5, 6] },
		],
	},
	{
		label: 'checkout',
		points: [
			{ timestamp: 60, counts: [10, 20, 30] },
			{ timestamp: 120, counts: [40, null, 60] },
		],
	},
];

function resolve(
	overrides: Partial<Parameters<typeof resolveHeatmapGrid>[0]> = {},
): ReturnType<typeof resolveHeatmapGrid> {
	return resolveHeatmapGrid({
		buckets: BUCKETS,
		step: STEP,
		series: TWO_GROUPS,
		...overrides,
	});
}

describe('resolveHeatmapGrid', () => {
	it('pivots per-timestamp count arrays into one row per bucket', () => {
		const { counts } = resolve({ series: [TWO_GROUPS[0]] });

		// 2 boundaries describe 3 rows; each row spans both columns.
		expect(counts).toStrictEqual([
			[1, null],
			[2, 5],
			[3, 6],
		]);
	});

	it('carries the bounds and step through untouched', () => {
		const { bounds, step } = resolve();

		expect(bounds).toStrictEqual(BUCKETS);
		expect(step).toBe(STEP);
	});

	it('sums every group for the combined view', () => {
		const { counts } = resolve();

		expect(counts[0]).toStrictEqual([11, 40]);
		expect(counts[2]).toStrictEqual([33, 66]);
	});

	it('keeps one group"s count where the other has no data', () => {
		const { counts } = resolve();

		// cart is null at 120 in row 0 while checkout reports 40.
		expect(counts[0][1]).toBe(40);
		// checkout is null at 120 in row 1 while cart reports 5.
		expect(counts[1][1]).toBe(5);
	});

	it('reports a cell as no-data only when every group is missing it', () => {
		const { counts } = resolve({
			buckets: [10],
			series: [
				{ label: 'a', points: [{ timestamp: 60, counts: [null, null] }] },
				{ label: 'b', points: [{ timestamp: 60, counts: [null, null] }] },
			],
		});

		expect(counts).toStrictEqual([[null], [null]]);
	});

	it('distinguishes a zero count from no data', () => {
		const { counts } = resolve({
			buckets: [10],
			series: [{ label: 'a', points: [{ timestamp: 60, counts: [0, null] }] }],
		});

		expect(counts[0][0]).toBe(0);
		expect(counts[1][0]).toBeNull();
	});

	it('sums only the groups the legend has enabled', () => {
		const { counts } = resolve({ visibleGroups: ['cart'] });

		expect(counts[0]).toStrictEqual([1, null]);
		expect(counts[2]).toStrictEqual([3, 6]);
	});

	it('sums every group when the legend passes nothing', () => {
		const { counts } = resolve({ visibleGroups: undefined });

		expect(counts[0]).toStrictEqual([11, 40]);
	});

	it('ignores an enabled label that left the result', () => {
		const { counts } = resolve({ visibleGroups: ['cart', 'gone'] });

		expect(counts[0]).toStrictEqual([1, null]);
	});

	it('empties the grid when every group is excluded', () => {
		const { timestamps, counts } = resolve({ visibleGroups: [] });

		expect(timestamps).toStrictEqual([]);
		expect(counts.every((row) => row.length === 0)).toBe(true);
	});

	it('unions timestamps when groups do not align', () => {
		const { timestamps, counts } = resolve({
			buckets: [10],
			series: [
				{ label: 'a', points: [{ timestamp: 60, counts: [1, 2] }] },
				{ label: 'b', points: [{ timestamp: 180, counts: [3, 4] }] },
			],
		});

		expect(timestamps).toStrictEqual([60, 180]);
		expect(counts[0]).toStrictEqual([1, 3]);
	});

	it('sorts columns ascending regardless of response order', () => {
		const { timestamps } = resolve({
			buckets: [10],
			series: [
				{
					label: 'a',
					points: [
						{ timestamp: 180, counts: [1, 2] },
						{ timestamp: 60, counts: [3, 4] },
					],
				},
			],
		});

		expect(timestamps).toStrictEqual([60, 180]);
	});

	it('pads rows the response left short', () => {
		const { counts } = resolve({
			buckets: [10, 20, 30],
			series: [{ label: 'a', points: [{ timestamp: 60, counts: [1, 2] }] }],
		});

		expect(counts).toStrictEqual([[1], [2], [null], [null]]);
	});

	it('ignores counts beyond the bucket rows', () => {
		const { counts } = resolve({
			buckets: [10],
			series: [{ label: 'a', points: [{ timestamp: 60, counts: [1, 2, 99] }] }],
		});

		expect(counts).toStrictEqual([[1], [2]]);
	});

	it('degrades to an empty grid with no buckets or no series', () => {
		expect(resolve({ buckets: [] })).toStrictEqual({
			bounds: [],
			timestamps: [],
			step: 0,
			counts: [],
		});
		expect(resolve({ series: [] }).counts).toStrictEqual([]);
	});
});
