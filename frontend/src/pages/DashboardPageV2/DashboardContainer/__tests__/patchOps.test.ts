import type {
	DashboardGridItemDTO,
	DashboardtypesLayoutDTO,
} from 'api/generated/services/sigNoz.schemas';

import { createDefaultPanel, createPanelOps } from '../patchOps';

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
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

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

	it('fills the empty right half of a row instead of wrapping to a new one', () => {
		// One 6-wide panel at the left of the top row → the new 6-wide panel fits
		// at x:6 in the same row.
		const layouts = [section([item(0, 6)])];
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(6);
		expect(value.y).toBe(0);
	});

	it('wraps to a new row when the last row is full', () => {
		// A full-width (12) row leaves no horizontal room, so the panel drops below.
		const layouts = [section([itemAt(0, 0, 12, 6)])];
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(6);
	});

	it('ignores a gap in an upper row and only fills the last row', () => {
		// Top row half-filled (x:0..6) but the last row is full → the new panel
		// starts a fresh row rather than back-filling the upper gap.
		const layouts = [section([itemAt(0, 0, 6, 6), itemAt(0, 6, 12, 6)])];
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(12);
	});

	it('fills the right of the last row when it has room', () => {
		// Full top row, half-filled last row → panel sits at x:6 of the last row.
		const layouts = [section([itemAt(0, 0, 12, 6), itemAt(0, 6, 6, 6)])];
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(6);
		expect(value.y).toBe(6);
	});

	it('checks the last row of the target section only, not other sections', () => {
		// Section 0 has a half-empty last row, but the panel is added to section 1;
		// placement is computed from section 1's last row (full → new row), and
		// section 0 is left untouched.
		const layouts = [
			section([itemAt(0, 0, 6, 6)]),
			section([itemAt(0, 0, 12, 6)]),
		];
		const ops = createPanelOps({ layouts, layoutIndex: 1, panelId: 'p1', panel });

		expect(ops[1].path).toBe('/spec/layouts/1/spec/items/-');
		const value = ops[1].value as DashboardGridItemDTO;
		expect(value.x).toBe(0);
		expect(value.y).toBe(6);
	});

	it('falls back to the last section when no index is requested', () => {
		const layouts = [section([]), section([item(0, 6)])];
		const ops = createPanelOps({
			layouts,
			layoutIndex: undefined,
			panelId: 'p1',
			panel,
		});

		expect(ops[1].path).toBe('/spec/layouts/1/spec/items/-');
	});

	it('falls back to the last section when the requested index is out of range', () => {
		const layouts = [section([])];
		const ops = createPanelOps({ layouts, layoutIndex: 5, panelId: 'p1', panel });
		expect(ops[1].path).toBe('/spec/layouts/0/spec/items/-');
	});

	it('creates a section first when the dashboard has none', () => {
		const ops = createPanelOps({
			layouts: [],
			layoutIndex: undefined,
			panelId: 'p1',
			panel,
		});

		expect(ops).toHaveLength(3);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/layouts/-' });
		expect(ops[1]).toMatchObject({ op: 'add', path: '/spec/panels/p1' });
		expect(ops[2].path).toBe('/spec/layouts/0/spec/items/-');
		expect((ops[2].value as DashboardGridItemDTO).y).toBe(0);
	});
});
