import type {
	DashboardGridItemDTO,
	DashboardtypesLayoutDTO,
} from 'api/generated/services/sigNoz.schemas';

import { createDefaultPanel, createPanelOps } from '../patchOps';

function item(y: number, height: number): DashboardGridItemDTO {
	return { x: 0, y, width: 6, height, content: { $ref: '#/spec/panels/x' } };
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

	it('adds the panel + a grid item at the bottom of the requested section', () => {
		const layouts = [section([item(0, 6)]), section([])];
		const ops = createPanelOps({ layouts, layoutIndex: 0, panelId: 'p1', panel });

		expect(ops).toHaveLength(2);
		expect(ops[0]).toMatchObject({ op: 'add', path: '/spec/panels/p1' });
		expect(ops[1]).toMatchObject({
			op: 'add',
			path: '/spec/layouts/0/spec/items/-',
		});
		// nextY = max(y + height) of existing items = 6.
		expect((ops[1].value as DashboardGridItemDTO).y).toBe(6);
		expect((ops[1].value as DashboardGridItemDTO).content?.$ref).toBe(
			'#/spec/panels/p1',
		);
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
