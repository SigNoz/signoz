import { Layout } from 'react-grid-layout';

import { applyRowCollapse, PanelMap } from '../utils';

// Helper to produce deeply-frozen objects that mimic what zustand/immer returns.
function freeze<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj), (_, v) =>
		typeof v === 'object' && v !== null ? Object.freeze(v) : v,
	) as T;
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const ROW_ID = 'row1';

/** A layout with one row followed by two widgets. */
function makeLayout(): Layout[] {
	return [
		{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 },
		{ i: 'w1', x: 0, y: 1, w: 6, h: 4 },
		{ i: 'w2', x: 6, y: 1, w: 6, h: 4 },
	];
}

/** panelMap where the row is expanded (collapsed = false, widgets = []). */
function makeExpandedPanelMap(): PanelMap {
	return {
		[ROW_ID]: { collapsed: false, widgets: [] },
	};
}

/** panelMap where the row is collapsed (widgets stored inside). */
function makeCollapsedPanelMap(): PanelMap {
	return {
		[ROW_ID]: {
			collapsed: true,
			widgets: [
				{ i: 'w1', x: 0, y: 1, w: 6, h: 4 },
				{ i: 'w2', x: 6, y: 1, w: 6, h: 4 },
			],
		},
	};
}

// ─── frozen-input guard (regression for zustand/immer read-only bug) ──────────

describe('applyRowCollapse – does not mutate frozen inputs', () => {
	it('does not throw when collapsing a row with frozen layout + panelMap', () => {
		expect(() =>
			applyRowCollapse(
				ROW_ID,
				freeze(makeLayout()),
				freeze(makeExpandedPanelMap()),
			),
		).not.toThrow();
	});

	it('does not throw when expanding a row with frozen layout + panelMap', () => {
		// Collapsed layout only has the row item; widgets live in panelMap.
		const collapsedLayout = freeze([{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 }]);
		expect(() =>
			applyRowCollapse(ROW_ID, collapsedLayout, freeze(makeCollapsedPanelMap())),
		).not.toThrow();
	});

	it('leaves the original layout array untouched after collapse', () => {
		const layout = makeLayout();
		const originalY = layout[1].y; // w1.y before collapse
		applyRowCollapse(ROW_ID, layout, makeExpandedPanelMap());
		expect(layout[1].y).toBe(originalY);
	});

	it('leaves the original panelMap untouched after collapse', () => {
		const panelMap = makeExpandedPanelMap();
		applyRowCollapse(ROW_ID, makeLayout(), panelMap);
		expect(panelMap[ROW_ID].collapsed).toBe(false);
	});
});

// ─── collapse behaviour ───────────────────────────────────────────────────────

describe('applyRowCollapse – collapsing a row', () => {
	it('sets collapsed = true on the row entry', () => {
		const { updatedPanelMap } = applyRowCollapse(
			ROW_ID,
			makeLayout(),
			makeExpandedPanelMap(),
		);
		expect(updatedPanelMap[ROW_ID].collapsed).toBe(true);
	});

	it('stores the child widgets inside the panelMap entry', () => {
		const { updatedPanelMap } = applyRowCollapse(
			ROW_ID,
			makeLayout(),
			makeExpandedPanelMap(),
		);
		const ids = updatedPanelMap[ROW_ID].widgets.map((w) => w.i);
		expect(ids).toContain('w1');
		expect(ids).toContain('w2');
	});

	it('removes child widgets from the returned layout', () => {
		const { updatedLayout } = applyRowCollapse(
			ROW_ID,
			makeLayout(),
			makeExpandedPanelMap(),
		);
		const ids = updatedLayout.map((l) => l.i);
		expect(ids).not.toContain('w1');
		expect(ids).not.toContain('w2');
		expect(ids).toContain(ROW_ID);
	});
});

// ─── expand behaviour ─────────────────────────────────────────────────────────

describe('applyRowCollapse – expanding a row', () => {
	it('sets collapsed = false on the row entry', () => {
		const collapsedLayout: Layout[] = [{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 }];
		const { updatedPanelMap } = applyRowCollapse(
			ROW_ID,
			collapsedLayout,
			makeCollapsedPanelMap(),
		);
		expect(updatedPanelMap[ROW_ID].collapsed).toBe(false);
	});

	it('restores child widgets to the returned layout', () => {
		const collapsedLayout: Layout[] = [{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 }];
		const { updatedLayout } = applyRowCollapse(
			ROW_ID,
			collapsedLayout,
			makeCollapsedPanelMap(),
		);
		const ids = updatedLayout.map((l) => l.i);
		expect(ids).toContain('w1');
		expect(ids).toContain('w2');
	});

	it('restored child widgets appear in both the layout and the panelMap entry', () => {
		const collapsedLayout: Layout[] = [{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 }];
		const { updatedLayout, updatedPanelMap } = applyRowCollapse(
			ROW_ID,
			collapsedLayout,
			makeCollapsedPanelMap(),
		);
		// The previously-stored widgets should now be back in the live layout.
		expect(updatedLayout.map((l) => l.i)).toContain('w1');
		// The panelMap entry still holds a reference to them (stale until next collapse).
		expect(updatedPanelMap[ROW_ID].widgets.map((w) => w.i)).toContain('w1');
	});
});

// ─── y-offset adjustment ──────────────────────────────────────────────────────

describe('applyRowCollapse – y-offset adjustments for rows below', () => {
	it('shifts items below a second row down when the first row expands', () => {
		const ROW2 = 'row2';
		// Layout: row1 (y=0,h=1) | w1 (y=1,h=4) | row2 (y=5,h=1) | w3 (y=6,h=2)
		const layout: Layout[] = [
			{ i: ROW_ID, x: 0, y: 0, w: 12, h: 1 },
			{ i: 'w1', x: 0, y: 1, w: 12, h: 4 },
			{ i: ROW2, x: 0, y: 5, w: 12, h: 1 },
			{ i: 'w3', x: 0, y: 6, w: 12, h: 2 },
		];
		const panelMap: PanelMap = {
			[ROW_ID]: {
				collapsed: true,
				widgets: [{ i: 'w1', x: 0, y: 1, w: 12, h: 4 }],
			},
			[ROW2]: { collapsed: false, widgets: [] },
		};
		// Expanding row1 should push row2 and w3 down by the height of w1 (4).
		const collapsedLayout = layout.filter((l) => l.i !== 'w1');
		const { updatedLayout } = applyRowCollapse(ROW_ID, collapsedLayout, panelMap);

		const row2Item = updatedLayout.find((l) => l.i === ROW2);
		expect(row2Item?.y).toBe(5 + 4); // shifted by maxY = 4
	});
});
