import type uPlot from 'uplot';

import { Quadtree } from '../../../utils/quadtree';
import {
	resolveHit,
	resolvePointDiameter,
	resolveSizeDomain,
} from '../geometry';
import { ScatterHit, ScatterPointSize } from '../types';

const POINT_SIZE: ScatterPointSize = { fixed: 6, min: 4, max: 20 };

const asData = (columns: unknown[]): uPlot.AlignedData =>
	columns as unknown as uPlot.AlignedData;

describe('resolveSizeDomain', () => {
	it('spans the size columns of every series, skipping nulls', () => {
		const data = asData([
			null,
			[
				[1, 2],
				[1, 2],
				[10, null],
			],
			[[3], [3], [40]],
		]);

		expect(resolveSizeDomain(data)).toStrictEqual({ min: 10, max: 40 });
	});

	it('is null when no series carries sizes', () => {
		expect(resolveSizeDomain(asData([null, [[1], [1]]]))).toBeNull();
		expect(resolveSizeDomain(asData([null, [[1], [1], [null]]]))).toBeNull();
	});
});

describe('resolvePointDiameter', () => {
	it('uses the fixed diameter without a size or a domain', () => {
		expect(resolvePointDiameter(null, { min: 0, max: 10 }, POINT_SIZE)).toBe(6);
		expect(resolvePointDiameter(5, null, POINT_SIZE)).toBe(6);
	});

	it('maps the domain ends to min and max', () => {
		const domain = { min: 0, max: 100 };
		expect(resolvePointDiameter(0, domain, POINT_SIZE)).toBe(4);
		expect(resolvePointDiameter(100, domain, POINT_SIZE)).toBe(20);
	});

	it('scales by area, not diameter', () => {
		const midArea = (4 ** 2 + 20 ** 2) / 2;
		expect(
			resolvePointDiameter(50, { min: 0, max: 100 }, POINT_SIZE),
		).toBeCloseTo(Math.sqrt(midArea));
	});

	it('clamps values outside the domain', () => {
		const domain = { min: 10, max: 20 };
		expect(resolvePointDiameter(-5, domain, POINT_SIZE)).toBe(4);
		expect(resolvePointDiameter(500, domain, POINT_SIZE)).toBe(20);
	});

	it('uses the midpoint when every size is the same', () => {
		expect(resolvePointDiameter(7, { min: 7, max: 7 }, POINT_SIZE)).toBe(12);
	});
});

describe('resolveHit', () => {
	const hit = (
		seriesIndex: number,
		dataIndex: number,
		x: number,
		y: number,
		d: number,
	): ScatterHit => ({ seriesIndex, dataIndex, x, y, w: d, h: d });

	it('returns the disc under the cursor', () => {
		const tree = new Quadtree<ScatterHit>(0, 0, 100, 100);
		tree.add(hit(1, 0, 10, 10, 6));
		tree.add(hit(2, 3, 50, 50, 6));

		expect(resolveHit(tree, 13, 13, 0)).toMatchObject({
			seriesIndex: 1,
			dataIndex: 0,
		});
		expect(resolveHit(tree, 52, 52, 0)).toMatchObject({
			seriesIndex: 2,
			dataIndex: 3,
		});
	});

	it('is null when the cursor is off every disc', () => {
		const tree = new Quadtree<ScatterHit>(0, 0, 100, 100);
		tree.add(hit(1, 0, 10, 10, 6));

		expect(resolveHit(tree, 30, 30, 0)).toBeNull();
	});

	it('tolerance widens each disc', () => {
		const tree = new Quadtree<ScatterHit>(0, 0, 100, 100);
		tree.add(hit(1, 0, 10, 10, 6));

		expect(resolveHit(tree, 18, 13, 0)).toBeNull();
		expect(resolveHit(tree, 18, 13, 3)).not.toBeNull();
	});

	it('prefers the disc whose centre is nearest when they overlap', () => {
		const tree = new Quadtree<ScatterHit>(0, 0, 100, 100);
		tree.add(hit(1, 0, 10, 10, 10));
		tree.add(hit(1, 1, 14, 10, 10));

		expect(resolveHit(tree, 13, 15, 0)?.dataIndex).toBe(0);
		expect(resolveHit(tree, 21, 15, 0)?.dataIndex).toBe(1);
	});
});
