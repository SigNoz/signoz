import type uPlot from 'uplot';

import { keepDecadeSplits } from '../logGridSplits';

const filter = (splits: number[]): (number | null)[] =>
	keepDecadeSplits({} as uPlot, splits, 0, 0, 0) as (number | null)[];

describe('keepDecadeSplits', () => {
	it('keeps the powers of ten and drops the minor splits between them', () => {
		expect(filter([1, 2, 5, 9, 10, 20, 100, 300])).toStrictEqual([
			1,
			null,
			null,
			null,
			10,
			null,
			100,
			null,
		]);
	});

	it('keeps sub-unit decades despite float noise', () => {
		expect(filter([0.001, 0.0010000000000000002, 0.002, 0.1])).toStrictEqual([
			0.001,
			0.0010000000000000002,
			null,
			0.1,
		]);
	});

	it('keeps zero and negative decades on a symmetric log', () => {
		expect(filter([-100, -50, -1, 0, 1, 5])).toStrictEqual([
			-100,
			null,
			-1,
			0,
			1,
			null,
		]);
	});
});
