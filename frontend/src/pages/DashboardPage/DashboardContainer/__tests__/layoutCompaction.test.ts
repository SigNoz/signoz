import type { DashboardtypesLayoutDTO } from 'api/generated/services/sigNoz.schemas';

import { compactGridItems, compactSpecLayouts } from '../layoutCompaction';
import type { GridItem } from '../utils';

const item = (
	id: string,
	x: number,
	y: number,
	width = 6,
	height = 2,
): GridItem => ({ id, x, y, width, height, panel: undefined });

describe('compactGridItems', () => {
	it('pulls a floating item up to the top', () => {
		const [a] = compactGridItems([item('a', 0, 5)]);
		expect(a.y).toBe(0);
	});

	it('resolves an overlap by pushing the colliding item down', () => {
		// Order is preserved, so [0] is 'a' and [1] is 'b'.
		const result = compactGridItems([item('a', 0, 0), item('b', 0, 1)]);
		// a occupies rows 0-1 (height 2), so b must sit at row 2 — no overlap.
		expect(result[0].y).toBe(0);
		expect(result[1].y).toBe(2);
	});

	it('preserves item order and the panel reference', () => {
		const panel = { kind: 'panel' } as unknown as GridItem['panel'];
		const result = compactGridItems([
			{ ...item('a', 0, 0), panel },
			item('b', 6, 0),
		]);
		expect(result.map((i) => i.id)).toStrictEqual(['a', 'b']);
		expect(result[0].panel).toBe(panel);
	});
});

describe('compactSpecLayouts', () => {
	const grid = (
		items: { x: number; y: number; width: number; height: number; ref: string }[],
	): DashboardtypesLayoutDTO =>
		({
			kind: 'Grid',
			spec: {
				items: items.map((i) => ({
					x: i.x,
					y: i.y,
					width: i.width,
					height: i.height,
					content: { $ref: i.ref },
				})),
			},
		}) as unknown as DashboardtypesLayoutDTO;

	it('compacts overlapping items and keeps their panel refs', () => {
		const [layout] = compactSpecLayouts([
			grid([
				{ x: 0, y: 0, width: 6, height: 2, ref: '#/spec/panels/a' },
				{ x: 0, y: 1, width: 6, height: 2, ref: '#/spec/panels/b' },
			]),
		]);
		const items = layout.spec?.items ?? [];
		expect(items[0]?.y).toBe(0);
		expect(items[1]?.y).toBe(2);
		expect(items[1]?.content?.$ref).toBe('#/spec/panels/b');
	});

	it('passes a non-Grid layout through untouched', () => {
		const other = { kind: 'Other' } as unknown as DashboardtypesLayoutDTO;
		expect(compactSpecLayouts([other])[0]).toBe(other);
	});
});
