import type {
	DashboardGridItemDTO,
	DashboardtypesLayoutDTO,
} from 'api/generated/services/sigNoz.schemas';

import { DashboardtypesPatchOpDTO } from 'api/generated/services/sigNoz.schemas';

import {
	bottomRowSlot,
	cloneSectionOps,
	createDefaultPanel,
	createPanelOps,
	findFreeSlot,
	itemsOverlap,
	setPanelTextOp,
	titleLooseLayoutsOps,
} from '../patchOps';

function item(y: number, height: number): DashboardGridItemDTO {
	return { x: 0, y, width: 6, height, content: { $ref: '#/spec/panels/x' } };
}

function itemAt(
	x: number,
	y: number,
	width: number,
	height: number,
): DashboardGridItemDTO {
	return { x, y, width, height, content: { $ref: '#/spec/panels/x' } };
}

function untitled(items: DashboardGridItemDTO[]): DashboardtypesLayoutDTO {
	return { kind: 'Grid', spec: { items } } as DashboardtypesLayoutDTO;
}

function section(items: DashboardGridItemDTO[]): DashboardtypesLayoutDTO {
	return {
		kind: 'Grid',
		spec: { display: { title: 'S' }, items },
	} as DashboardtypesLayoutDTO;
}

describe('createDefaultPanel', () => {
	it('builds a Panel of the given kind with no queries (filled in on save)', () => {
		const panel = createDefaultPanel('signoz/NumberPanel');
		expect(panel.kind).toBe('Panel');
		expect(panel.spec.plugin.kind).toBe('signoz/NumberPanel');
		expect(panel.spec.queries).toStrictEqual([]);
		expect(panel.spec.display.name).toBe('New panel');
	});
});

describe('createPanelOps', () => {
	const panel = createDefaultPanel('signoz/TimeSeriesPanel');

	it('adds the panel + a grid item in the requested section', () => {
		const layouts = [section([item(0, 6)]), section([])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		expect(ops).toHaveLength(2);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/panels/p1' });
		expect(ops[1]).toMatchObject({
			op: 'add',
			path: '/spec/layouts/0/spec/items/-',
		});
		expect((ops[1].value as DashboardGridItemDTO).content?.$ref).toBe(
			'#/spec/panels/p1',
		);
	});

	it('creates the requested new section and places the panel in it', () => {
		const layouts = [section([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'newSection', title: ' Errors ' },
			panelId: 'p1',
			panel,
		});

		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/layouts/-' });
		expect(ops[0].value).toMatchObject({
			spec: { display: { title: 'Errors' } },
		});
		expect(ops[2]).toMatchObject({ path: '/spec/layouts/1/spec/items/-' });
		expect(ops[2].value).toMatchObject({ x: 0, y: 0 });
	});

	it('titles loose panels before creating a section on a free-flowing dashboard', () => {
		const layouts = [untitled([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'newSection', title: 'Errors' },
			panelId: 'p1',
			panel,
		});

		expect(ops[0]).toMatchObject({
			path: '/spec/layouts/0/spec/display',
			value: { title: 'Section 1' },
		});
		expect(ops[1]).toMatchObject({ path: '/spec/layouts/-' });
		expect(ops[3]).toMatchObject({ path: '/spec/layouts/1/spec/items/-' });
	});

	it('inserts a root ahead of the sections when there is none', () => {
		const layouts = [section([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'root' },
			panelId: 'p1',
			panel,
		});

		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/layouts/0' });
		expect(ops[0].value).toMatchObject({ spec: { items: [] } });
		expect(ops[2]).toMatchObject({ path: '/spec/layouts/0/spec/items/-' });
		expect(ops[2].value).toMatchObject({ x: 0, y: 0 });
	});

	it('adds to the existing root', () => {
		const layouts = [untitled([item(0, 6)]), section([])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'root' },
			panelId: 'p1',
			panel,
		});

		expect(ops).toHaveLength(2);
		expect(ops[1]).toMatchObject({ path: '/spec/layouts/0/spec/items/-' });
		expect(ops[1].value).toMatchObject({ x: 6, y: 0 });
	});

	it('fills the empty right half of a row instead of wrapping to a new one', () => {
		// Left half filled → new 6-wide panel fits at x:6 in the same row.
		const layouts = [section([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(6);
		expect(value.y).toBe(0);
	});

	it('wraps to a new row when the last row is full', () => {
		// Full-width (12) row leaves no room → panel drops to the next row.
		const layouts = [section([itemAt(0, 0, 12, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(6);
	});

	it('ignores a gap in an upper row and only fills the last row', () => {
		// Upper-row gap is ignored when the last row is full → starts a fresh row.
		const layouts = [section([itemAt(0, 0, 6, 6), itemAt(0, 6, 12, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(12);
	});

	it('fills the right of the last row when it has room', () => {
		// Half-filled last row → panel sits at x:6 of that row.
		const layouts = [section([itemAt(0, 0, 12, 6), itemAt(0, 6, 6, 6)])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(6);
		expect(value.y).toBe(6);
	});

	it('checks the last row of the target section only, not other sections', () => {
		// Placement uses the target section's (1) last row, ignoring section 0's gap.
		const layouts = [
			section([itemAt(0, 0, 6, 6)]),
			section([itemAt(0, 0, 12, 6)]),
		];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 1 },
			panelId: 'p1',
			panel,
		});

		expect(ops[1].path).toBe('/spec/layouts/1/spec/items/-');
		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(6);
	});

	it('falls back to the root (first) section when no index is requested', () => {
		const layouts = [section([]), section([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			panelId: 'p1',
			panel,
		});

		expect(ops[1].path).toBe('/spec/layouts/0/spec/items/-');
	});

	it('falls back to the root (first) section when the requested index is out of range', () => {
		const layouts = [section([item(0, 6)]), section([])];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 5 },
			panelId: 'p1',
			panel,
		});
		expect(ops[1].path).toBe('/spec/layouts/0/spec/items/-');
	});

	it('creates a section first when the dashboard has none', () => {
		const ops = createPanelOps({
			layouts: [],
			panelId: 'p1',
			panel,
		});

		expect(ops).toHaveLength(3);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/layouts/-' });
		expect(ops[1]).toMatchObject({ op: 'add', path: '/spec/panels/p1' });
		expect(ops[2].path).toBe('/spec/layouts/0/spec/items/-');
		expect((ops[2].value as DashboardGridItemDTO).y).toBe(0);
	});

	it('wraps to the bottom when the last-row slot is blocked by a taller earlier-row panel', () => {
		// Regression: the last row (top-y 6) has room at x:3, but the tall right
		// panel spans y:0..12 into it. Placing at x:3,y:6 would overlap it, so the
		// panel must drop to a fresh row at the bottom (y:12) instead.
		const layouts = [
			section([
				itemAt(0, 0, 6, 6),
				itemAt(6, 0, 6, 12), // tall, reaches down into the last row
				itemAt(0, 6, 3, 6),
			]),
		];
		const ops = createPanelOps({
			layouts,
			target: { type: 'section', layoutIndex: 0 },
			panelId: 'p1',
			panel,
		});

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(12);
	});
});

describe('itemsOverlap', () => {
	it('is true only when rectangles intersect on both axes', () => {
		const a = { x: 0, y: 0, width: 6, height: 6 };
		expect(itemsOverlap(a, { x: 3, y: 3, width: 6, height: 6 })).toBe(true);
		// Touching edges do not overlap (half-open intervals).
		expect(itemsOverlap(a, { x: 6, y: 0, width: 6, height: 6 })).toBe(false);
		expect(itemsOverlap(a, { x: 0, y: 6, width: 6, height: 6 })).toBe(false);
		// Overlaps on x only (disjoint on y) → no overlap.
		expect(itemsOverlap(a, { x: 3, y: 6, width: 6, height: 6 })).toBe(false);
	});
});

describe('findFreeSlot', () => {
	it('places the first item at the origin', () => {
		expect(findFreeSlot([], 6)).toStrictEqual({ x: 0, y: 0 });
	});

	it('fills the right of the last row when it fits and is clear', () => {
		expect(findFreeSlot([itemAt(0, 0, 6, 6)], 6)).toStrictEqual({ x: 6, y: 0 });
	});

	it('never returns a slot that overlaps an existing item', () => {
		const items = [itemAt(0, 0, 6, 6), itemAt(6, 0, 6, 12), itemAt(0, 6, 3, 6)];
		const slot = findFreeSlot(items, 6);
		const placed = { ...slot, width: 6, height: 6 };
		expect(items.some((it) => itemsOverlap(placed, it))).toBe(false);
		expect(slot).toStrictEqual({ x: 0, y: 12 });
	});

	it('clamps a too-wide panel to the grid width', () => {
		// width 20 > 12 cols → clamped to 12, so it wraps below the first row.
		expect(findFreeSlot([itemAt(0, 0, 6, 6)], 20)).toStrictEqual({ x: 0, y: 6 });
	});
});

describe('bottomRowSlot', () => {
	it('is the origin for an empty section', () => {
		expect(bottomRowSlot([])).toStrictEqual({ x: 0, y: 0 });
	});

	it('drops a fresh left-edge row below the tallest reaching item', () => {
		// max(y + height) across items: itemAt(6,0,6,12) reaches y=12.
		const items = [itemAt(0, 0, 6, 6), itemAt(6, 0, 6, 12)];
		expect(bottomRowSlot(items)).toStrictEqual({ x: 0, y: 12 });
	});

	it('never returns a slot that overlaps an existing item', () => {
		const items = [itemAt(0, 0, 6, 6), itemAt(6, 0, 6, 12), itemAt(0, 6, 3, 6)];
		const placed = { ...bottomRowSlot(items), width: 12, height: 6 };
		expect(items.some((it) => itemsOverlap(placed, it))).toBe(false);
	});
});

describe('cloneSectionOps', () => {
	const panel = createDefaultPanel('signoz/TimeSeriesPanel');

	it('adds a fresh panel per source panel + a titled Grid referencing them, geometry preserved', () => {
		const ops = cloneSectionOps('Overview (Copy)', [
			{ newId: 'n1', panel, x: 0, y: 0, width: 6, height: 4 },
			{ newId: 'n2', panel, x: 6, y: 0, width: 6, height: 4 },
		]);

		// One add per panel, then the layout append.
		expect(ops).toHaveLength(3);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/panels/n1' });
		expect(ops[1]).toMatchObject({ op: 'add', path: '/spec/panels/n2' });

		const layoutOp = ops[2];
		expect(layoutOp).toMatchObject({ op: 'add', path: '/spec/layouts/-' });
		const layout = layoutOp.value as DashboardtypesLayoutDTO;
		expect(layout.spec?.display?.title).toBe('Overview (Copy)');
		expect(layout.spec?.items).toHaveLength(2);
		expect(layout.spec?.items?.[1]).toMatchObject({
			x: 6,
			y: 0,
			width: 6,
			height: 4,
			content: { $ref: '#/spec/panels/n2' },
		});
	});

	it('produces just the empty titled Grid when the section has no panels', () => {
		const ops = cloneSectionOps('Empty (Copy)', []);
		expect(ops).toHaveLength(1);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/layouts/-' });
		expect((ops[0].value as DashboardtypesLayoutDTO).spec?.items).toHaveLength(0);
	});
});

describe('setPanelTextOp', () => {
	it("points at the panel's authored body", () => {
		expect(setPanelTextOp('p1', '- [x] done')).toStrictEqual({
			op: DashboardtypesPatchOpDTO.add,
			path: '/spec/panels/p1/spec/plugin/spec/text',
			value: '- [x] done',
		});
	});

	// A panel saved before it had a body carries no `text` member, which `replace`
	// would refuse.
	it('adds rather than replaces', () => {
		expect(setPanelTextOp('p1', '').op).toBe(DashboardtypesPatchOpDTO.add);
	});
});

describe('titleLooseLayoutsOps', () => {
	it('titles only untitled layouts that hold panels', () => {
		const ops = titleLooseLayoutsOps([
			untitled([item(0, 6)]),
			untitled([]),
			untitled([item(0, 6)]),
		]);

		expect(ops.map((op) => [op.path, op.value])).toStrictEqual([
			['/spec/layouts/0/spec/display', { title: 'Section 1' }],
			['/spec/layouts/2/spec/display', { title: 'Section 2' }],
		]);
	});

	it('does nothing once the dashboard has a titled section', () => {
		expect(
			titleLooseLayoutsOps([untitled([item(0, 6)]), section([])]),
		).toStrictEqual([]);
	});
});
