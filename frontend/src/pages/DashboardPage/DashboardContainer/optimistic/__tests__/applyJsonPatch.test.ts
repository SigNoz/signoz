import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesPatchOpDTO } from 'api/generated/services/sigNoz.schemas';

import { applyJsonPatch } from '../applyJsonPatch';

const { add, replace, remove, move, test: testOp } = DashboardtypesPatchOpDTO;

function op(
	o: DashboardtypesPatchOpDTO,
	path: string,
	value?: unknown,
): DashboardtypesJSONPatchOperationDTO {
	return { op: o, path, value };
}

// A trimmed dashboard-spec shape; the applier is structural, so this stands in
// for the full DTO.
function spec(): Record<string, unknown> {
	return {
		spec: {
			display: { name: 'dash' },
			panels: { p1: { spec: { display: { name: 'A' } } } },
			layouts: [
				{ spec: { display: { title: 'S1' }, items: [{ x: 0 }] } },
				{ spec: { items: [] } },
			],
			variables: [{ name: 'env' }],
		},
	};
}

describe('applyJsonPatch', () => {
	it('does not mutate the input document', () => {
		const doc = spec();
		const snapshot = JSON.stringify(doc);
		applyJsonPatch(doc, [op(replace, '/spec/display/name', 'renamed')]);
		expect(JSON.stringify(doc)).toBe(snapshot);
	});

	it('does not mutate the input ops when a later op targets a just-added node', () => {
		// New-panel-on-empty-dashboard batch: add an empty section, then add an
		// item into it. The item must not leak back into the section-add op's value
		// (which is still queued for the network request) via a shared reference.
		const ops = [
			op(add, '/spec/layouts/-', { spec: { items: [] } }),
			op(add, '/spec/layouts/0/spec/items/-', { x: 0, y: 0 }),
		];
		const empty = { spec: { layouts: [] } };
		const next = applyJsonPatch(empty, ops);

		// The section-add op's value stays empty — only the applied document grows.
		expect((ops[0].value as any).spec.items).toStrictEqual([]);
		expect((next.spec as any).layouts[0].spec.items).toStrictEqual([
			{ x: 0, y: 0 },
		]);
	});

	it('replaces a leaf string', () => {
		const next = applyJsonPatch(spec(), [
			op(replace, '/spec/layouts/0/spec/display/title', 'S1-renamed'),
		]);
		const layouts = (next.spec as any).layouts;
		expect(layouts[0].spec.display.title).toBe('S1-renamed');
	});

	it('adds a new object member (panel by id)', () => {
		const next = applyJsonPatch(spec(), [
			op(add, '/spec/panels/p2', { spec: { display: { name: 'B' } } }),
		]);
		expect((next.spec as any).panels.p2.spec.display.name).toBe('B');
		// existing member untouched
		expect((next.spec as any).panels.p1.spec.display.name).toBe('A');
	});

	it('appends to an array with the "-" token', () => {
		const next = applyJsonPatch(spec(), [
			op(add, '/spec/layouts/-', { spec: { items: [] } }),
		]);
		expect((next.spec as any).layouts).toHaveLength(3);
	});

	it('appends an item into a nested section array', () => {
		const next = applyJsonPatch(spec(), [
			op(add, '/spec/layouts/1/spec/items/-', { x: 5 }),
		]);
		expect((next.spec as any).layouts[1].spec.items).toStrictEqual([{ x: 5 }]);
	});

	it('replaces a whole array', () => {
		const next = applyJsonPatch(spec(), [
			op(replace, '/spec/variables', [{ name: 'region' }, { name: 'pod' }]),
		]);
		expect((next.spec as any).variables).toStrictEqual([
			{ name: 'region' },
			{ name: 'pod' },
		]);
	});

	it('removes an array element by index (section)', () => {
		const next = applyJsonPatch(spec(), [op(remove, '/spec/layouts/0')]);
		const layouts = (next.spec as any).layouts;
		expect(layouts).toHaveLength(1);
		expect(layouts[0].spec.items).toStrictEqual([]);
	});

	it('removes an object member (panel by id)', () => {
		const next = applyJsonPatch(spec(), [op(remove, '/spec/panels/p1')]);
		expect((next.spec as any).panels).toStrictEqual({});
	});

	it('adds a missing object parent for an add op (title untitled section)', () => {
		const next = applyJsonPatch(spec(), [
			op(add, '/spec/layouts/1/spec/display', { title: 'S2' }),
		]);
		expect((next.spec as any).layouts[1].spec.display).toStrictEqual({
			title: 'S2',
		});
	});

	it('is lenient: remove on a missing path is a no-op', () => {
		const next = applyJsonPatch(spec(), [op(remove, '/spec/panels/ghost')]);
		expect((next.spec as any).panels.p1).toBeDefined();
	});

	it('is lenient: a path through a missing node is skipped', () => {
		const next = applyJsonPatch(spec(), [op(replace, '/spec/nope/deep/leaf', 1)]);
		expect(next).toStrictEqual(spec());
	});

	it('unescapes ~1 and ~0 in reference tokens', () => {
		const doc = { spec: { m: { 'a/b': 1, 'c~d': 2 } } };
		const next = applyJsonPatch(doc, [
			op(replace, '/spec/m/a~1b', 9),
			op(replace, '/spec/m/c~0d', 8),
		]);
		expect(next.spec.m).toStrictEqual({ 'a/b': 9, 'c~d': 8 });
	});

	it('applies multiple ops in order', () => {
		const next = applyJsonPatch(spec(), [
			op(add, '/spec/panels/p2', { spec: {} }),
			op(remove, '/spec/panels/p1'),
			op(replace, '/spec/display/name', 'z'),
		]);
		expect(Object.keys((next.spec as any).panels)).toStrictEqual(['p2']);
		expect((next.spec as any).display.name).toBe('z');
	});

	it('treats move/copy/test as no-ops', () => {
		const next = applyJsonPatch(spec(), [
			op(move, '/spec/display/name'),
			op(testOp, '/spec/display/name', 'dash'),
		]);
		expect(next).toStrictEqual(spec());
	});
});
