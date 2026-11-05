import type { PieSlice } from 'lib/visualization/charts/types';

import {
	groupPieSlices,
	OTHER_SLICE_LABEL,
} from 'lib/visualization/charts/Pie/utils/groupPieSlices';

const slice = (label: string, value: number): PieSlice => ({
	label,
	value,
	color: '#000000',
	queryName: 'A',
});

const group = (slices: PieSlice[]): PieSlice[] => groupPieSlices(slices, true);

describe('groupPieSlices', () => {
	it('folds a long tail into a trailing Other, keeping kept-slice order', () => {
		const slices = [
			slice('b', 400),
			slice('tail1', 2),
			slice('a', 500),
			slice('tail2', 4),
			slice('tail3', 1),
		];

		const result = group(slices);

		expect(result.map((s) => [s.label, s.value])).toStrictEqual([
			['b', 400],
			['a', 500],
			[OTHER_SLICE_LABEL, 7],
		]);
		expect(result[2].members?.map((s) => s.label)).toStrictEqual([
			'tail2',
			'tail1',
			'tail3',
		]);
		expect(result[2].queryName).toBeUndefined();
	});

	it('caps a flat pie at 14 slices + Other', () => {
		const slices = Array.from({ length: 30 }, (_, i) => slice(`s${i}`, 100 - i));

		const result = group(slices);

		expect(result).toHaveLength(15);
		expect(result.slice(0, 14).map((s) => s.label)).toStrictEqual(
			slices.slice(0, 14).map((s) => s.label),
		);
		expect(result[14].label).toBe(OTHER_SLICE_LABEL);
		expect(result[14].members).toHaveLength(16);
	});

	it('keeps exactly 15 large slices ungrouped', () => {
		const slices = Array.from({ length: 15 }, (_, i) => slice(`s${i}`, 10));

		expect(group(slices)).toBe(slices);
	});

	it('leaves a single small slice under its own name', () => {
		const slices = [slice('a', 500), slice('b', 400), slice('tiny', 1)];

		expect(group(slices)).toBe(slices);
	});

	it('keeps a dominant Other at its true size and conserves the total', () => {
		const slices = [
			slice('a', 300),
			...Array.from({ length: 400 }, (_, i) => slice(`t${i}`, 1)),
		];

		const result = group(slices);

		expect(result).toHaveLength(15);
		expect(result[0].label).toBe('a');
		expect(result[14].label).toBe(OTHER_SLICE_LABEL);
		expect(result[14].value).toBe(387);
		expect(result[14].members).toHaveLength(387);
	});

	it('keeps 14 slices when every slice is under the share threshold', () => {
		// 200 × 0.5%: grouping by share alone would leave one 100% Other.
		const slices = Array.from({ length: 200 }, (_, i) => slice(`s${i}`, 5));

		const result = group(slices);

		expect(result.slice(0, 14).map((s) => s.label)).toStrictEqual(
			slices.slice(0, 14).map((s) => s.label),
		);
		expect(result[14].label).toBe(OTHER_SLICE_LABEL);
		expect(result[14].members).toHaveLength(186);
		expect(result[14].value).toBe(930);
	});

	it('breaks ties by input order', () => {
		const slices = Array.from({ length: 20 }, (_, i) => slice(`s${i}`, 5));

		const result = group(slices);

		expect(result.slice(0, 14).map((s) => s.label)).toStrictEqual(
			slices.slice(0, 14).map((s) => s.label),
		);
		expect(result[14].members?.map((s) => s.label)).toStrictEqual(
			slices.slice(14).map((s) => s.label),
		);
	});

	it('returns an empty pie unchanged', () => {
		expect(group([])).toStrictEqual([]);
	});
});
