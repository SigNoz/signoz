import type { DashboardtypesDashboardSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { findPanelLayoutIssues } from '../danglingPanels';

const grid = (refs: string[]): unknown => ({
	kind: 'Grid',
	spec: { items: refs.map((r) => ({ content: { $ref: r } })) },
});

// Cast a loose fixture to the spec type — the helper is defensive against the
// untrusted, hand-edited JSON it runs on.
const spec = (value: unknown): DashboardtypesDashboardSpecDTO =>
	value as DashboardtypesDashboardSpecDTO;

describe('findPanelLayoutIssues', () => {
	it('flags nothing when panels and layouts agree', () => {
		expect(
			findPanelLayoutIssues(
				spec({
					panels: { a: {}, b: {} },
					layouts: [grid(['#/spec/panels/a', '#/spec/panels/b'])],
				}),
			),
		).toStrictEqual({ danglingPanelIds: [], missingPanelRefs: [] });
	});

	it('lists panels placed in no layout as dangling', () => {
		const result = findPanelLayoutIssues(
			spec({
				panels: { a: {}, b: {}, c: {} },
				layouts: [grid(['#/spec/panels/a'])],
			}),
		);
		expect(result.danglingPanelIds.sort()).toStrictEqual(['b', 'c']);
		expect(result.missingPanelRefs).toStrictEqual([]);
	});

	it('treats a removed/empty layout as orphaning every panel', () => {
		expect(
			findPanelLayoutIssues(
				spec({ panels: { a: {}, b: {} }, layouts: [] }),
			).danglingPanelIds.sort(),
		).toStrictEqual(['a', 'b']);
	});

	it('lists layout refs to a panel that no longer exists as missing', () => {
		const result = findPanelLayoutIssues(
			spec({
				panels: { a: {} },
				layouts: [grid(['#/spec/panels/a', '#/spec/panels/ghost'])],
			}),
		);
		expect(result.danglingPanelIds).toStrictEqual([]);
		expect(result.missingPanelRefs).toStrictEqual(['ghost']);
	});

	it('handles empty / malformed specs', () => {
		expect(
			findPanelLayoutIssues(spec({ panels: {}, layouts: [] })),
		).toStrictEqual({
			danglingPanelIds: [],
			missingPanelRefs: [],
		});
		expect(findPanelLayoutIssues(undefined)).toStrictEqual({
			danglingPanelIds: [],
			missingPanelRefs: [],
		});
	});
});
