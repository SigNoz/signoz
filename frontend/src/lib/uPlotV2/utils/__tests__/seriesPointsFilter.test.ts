import type uPlot from 'uplot';

import {
	findNearestNonNull,
	findSandwichedIndices,
	isolatedPointFilter,
} from '../seriesPointsFilter';

// ---------------------------------------------------------------------------
// Minimal uPlot stub — only the surface used by seriesPointsFilter
// ---------------------------------------------------------------------------

function makeUPlot({
	xData,
	yData,
	idxs,
	valToPosFn,
	posToIdxFn,
}: {
	xData: number[];
	yData: (number | null | undefined)[];
	idxs?: [number, number];
	valToPosFn?: (val: number) => number;
	posToIdxFn?: (pos: number) => number;
}): uPlot {
	return {
		data: [xData, yData],
		series: [{}, { idxs: idxs ?? [0, yData.length - 1] }],
		valToPos: jest.fn((val: number) => (valToPosFn ? valToPosFn(val) : val)),
		posToIdx: jest.fn((pos: number) =>
			posToIdxFn ? posToIdxFn(pos) : Math.round(pos),
		),
	} as unknown as uPlot;
}

// ---------------------------------------------------------------------------
// findNearestNonNull
// ---------------------------------------------------------------------------

describe('findNearestNonNull', () => {
	it('returns the right neighbor when left side is null', () => {
		const yData = [null, null, 42, null];
		expect(findNearestNonNull(yData, 1)).toBe(2);
	});

	it('returns the left neighbor when right side is null', () => {
		const yData = [null, 42, null, null];
		expect(findNearestNonNull(yData, 2)).toBe(1);
	});

	it('prefers the right neighbor over the left when both exist at the same distance', () => {
		const yData = [10, null, 20];
		// j=1: right (idx 3) is out of bounds (undefined == null), left (idx 1) is null
		// Actually right (idx 2) exists at j=1
		expect(findNearestNonNull(yData, 1)).toBe(2);
	});

	it('returns approxIdx unchanged when no non-null value is found within 100 steps', () => {
		const yData: (number | null)[] = Array(5).fill(null);
		expect(findNearestNonNull(yData, 2)).toBe(2);
	});

	it('handles undefined values the same as null', () => {
		const yData: (number | null | undefined)[] = [undefined, undefined, 99];
		expect(findNearestNonNull(yData, 0)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// findSandwichedIndices
// ---------------------------------------------------------------------------

describe('findSandwichedIndices', () => {
	it('returns empty array when no consecutive gaps share a pixel boundary', () => {
		const gaps = [
			[0, 10],
			[20, 30],
		];
		const yData = [1, null, null, 2];
		const u = makeUPlot({ xData: [0, 1, 2, 3], yData });
		expect(findSandwichedIndices(gaps, yData, u)).toStrictEqual([]);
	});

	it('returns the index between two gaps that share a pixel boundary', () => {
		// gaps[0] ends at 10, gaps[1] starts at 10 → sandwiched point at pixel 10
		const gaps = [
			[0, 10],
			[10, 20],
		];
		// posToIdx(10) → 2
		const yData = [null, null, 5, null, null];
		const u = makeUPlot({ xData: [0, 1, 2, 3, 4], yData, posToIdxFn: () => 2 });
		expect(findSandwichedIndices(gaps, yData, u)).toStrictEqual([2]);
	});

	it('scans to nearest non-null when posToIdx lands on a null', () => {
		// posToIdx returns 2 which is null; nearest non-null is index 3
		const gaps = [
			[0, 10],
			[10, 20],
		];
		const yData = [null, null, null, 7, null];
		const u = makeUPlot({ xData: [0, 1, 2, 3, 4], yData, posToIdxFn: () => 2 });
		expect(findSandwichedIndices(gaps, yData, u)).toStrictEqual([3]);
	});

	it('returns multiple indices when several gap pairs share boundaries', () => {
		// Three consecutive gaps: [0,10], [10,20], [20,30]
		// → two sandwiched points: between gaps 0-1 at px 10, between gaps 1-2 at px 20
		const gaps = [
			[0, 10],
			[10, 20],
			[20, 30],
		];
		const yData = [null, 1, null, 2, null];
		const u = makeUPlot({
			xData: [0, 1, 2, 3, 4],
			yData,
			posToIdxFn: (pos) => (pos === 10 ? 1 : 3),
		});
		expect(findSandwichedIndices(gaps, yData, u)).toStrictEqual([1, 3]);
	});
});

// ---------------------------------------------------------------------------
// isolatedPointFilter
// ---------------------------------------------------------------------------

describe('isolatedPointFilter', () => {
	it('returns null when show is true (normal point rendering active)', () => {
		const u = makeUPlot({ xData: [0, 1], yData: [1, null] });
		expect(isolatedPointFilter(u, 1, true, [[0, 10]])).toBeNull();
	});

	it('returns null when gaps is null', () => {
		const u = makeUPlot({ xData: [0, 1], yData: [1, null] });
		expect(isolatedPointFilter(u, 1, false, null)).toBeNull();
	});

	it('returns null when gaps is empty', () => {
		const u = makeUPlot({ xData: [0, 1], yData: [1, null] });
		expect(isolatedPointFilter(u, 1, false, [])).toBeNull();
	});

	it('returns null when series idxs is undefined', () => {
		const u = {
			data: [
				[0, 1],
				[1, null],
			],
			series: [{}, { idxs: undefined }],
			valToPos: jest.fn(() => 0),
			posToIdx: jest.fn(() => 0),
		} as unknown as uPlot;
		expect(isolatedPointFilter(u, 1, false, [[0, 10]])).toBeNull();
	});

	it('includes firstIdx when the first gap starts at the first data point pixel', () => {
		// xData[firstIdx=0] → valToPos → 5; gaps[0][0] === 5 → isolated leading point
		const xData = [0, 1, 2, 3, 4];
		const yData = [10, null, null, null, 20];
		const u = makeUPlot({
			xData,
			yData,
			idxs: [0, 4],
			valToPosFn: (val) => (val === 0 ? 5 : 40), // firstPos=5, lastPos=40
		});
		// gaps[0][0] === 5 (firstPos), gaps last end !== 40
		const result = isolatedPointFilter(u, 1, false, [
			[5, 15],
			[20, 30],
		]);
		expect(result).toContain(0); // firstIdx
	});

	it('includes lastIdx when the last gap ends at the last data point pixel', () => {
		const xData = [0, 1, 2, 3, 4];
		const yData = [10, null, null, null, 20];
		const u = makeUPlot({
			xData,
			yData,
			idxs: [0, 4],
			valToPosFn: (val) => (val === 0 ? 5 : 40), // firstPos=5, lastPos=40
		});
		// gaps last end === 40 (lastPos), gaps[0][0] !== 5
		const result = isolatedPointFilter(u, 1, false, [
			[10, 20],
			[30, 40],
		]);
		expect(result).toContain(4); // lastIdx
	});

	it('includes sandwiched index between two gaps sharing a pixel boundary', () => {
		const xData = [0, 1, 2, 3, 4];
		const yData = [null, null, 5, null, null];
		const u = makeUPlot({
			xData,
			yData,
			idxs: [0, 4],
			valToPosFn: () => 99, // firstPos/lastPos won't match gap boundaries
			posToIdxFn: () => 2,
		});
		const result = isolatedPointFilter(u, 1, false, [
			[0, 50],
			[50, 100],
		]);
		expect(result).toContain(2);
	});

	it('returns null when no isolated points are found', () => {
		const xData = [0, 1, 2];
		const yData = [1, 2, 3];
		const u = makeUPlot({
			xData,
			yData,
			idxs: [0, 2],
			// firstPos = 10, lastPos = 30 — neither matches any gap boundary
			valToPosFn: (val) => (val === 0 ? 10 : 30),
		});
		// gaps don't share boundaries and don't touch firstPos/lastPos
		const result = isolatedPointFilter(u, 1, false, [
			[0, 5],
			[15, 20],
		]);
		expect(result).toBeNull();
	});

	it('returns all three kinds of isolated points in one pass', () => {
		// Leading (firstPos=0 === gaps[0][0]), sandwiched (gaps[1] and gaps[2] share 50),
		// trailing (lastPos=100 === gaps last end)
		const xData = [0, 1, 2, 3, 4];
		const yData = [1, null, 2, null, 3];
		const u = makeUPlot({
			xData,
			yData,
			idxs: [0, 4],
			valToPosFn: (val) => (val === 0 ? 0 : 100),
			posToIdxFn: () => 2, // sandwiched point at idx 2
		});
		const gaps = [
			[0, 20],
			[40, 50],
			[50, 80],
			[90, 100],
		];
		const result = isolatedPointFilter(u, 1, false, gaps);
		expect(result).toContain(0); // leading
		expect(result).toContain(2); // sandwiched
		expect(result).toContain(4); // trailing
	});
});
