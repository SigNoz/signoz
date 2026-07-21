import type {
	DashboardtypesDashboardSpecDTOPanels,
	DashboardtypesJSONPatchOperationDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	buildApplyVariableToPanelsPatch,
	buildSyncVariableToPanelsPatch,
	getPanelIdsReferencingVariable,
} from '../utils/applyVariableToPanelsPatch';

/** Minimal builder-query panel wrapped in a CompositeQuery, with a given filter. */
function compositePanel(filterExpression: string): unknown {
	return {
		kind: 'panel',
		spec: {
			display: { title: '' },
			plugin: { kind: 'signoz/TimeSeries', spec: {} },
			queries: [
				{
					kind: 'builder_query',
					spec: {
						plugin: {
							kind: 'signoz/CompositeQuery',
							spec: {
								queries: [
									{
										type: 'builder_query',
										spec: {
											name: 'A',
											signal: 'logs',
											filter: { expression: filterExpression },
										},
									},
								],
							},
						},
					},
				},
			],
		},
	};
}

/** A bare LIST-style BuilderQuery panel (filter lives directly on the plugin spec). */
function listPanel(filterExpression: string): unknown {
	return {
		kind: 'panel',
		spec: {
			display: { title: '' },
			plugin: { kind: 'signoz/List', spec: {} },
			queries: [
				{
					kind: 'builder_query',
					spec: {
						plugin: {
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'logs',
								filter: { expression: filterExpression },
							},
						},
					},
				},
			],
		},
	};
}

/** A PromQL panel — no builder filter, must be skipped. */
function promqlPanel(): unknown {
	return {
		kind: 'panel',
		spec: {
			display: { title: '' },
			plugin: { kind: 'signoz/TimeSeries', spec: {} },
			queries: [
				{
					kind: 'promql',
					spec: {
						plugin: { kind: 'signoz/PromQLQuery', spec: { query: 'up' } },
					},
				},
			],
		},
	};
}

/** Reads the first builder query's filter expression out of a patch op's value. */
function expressionOf(
	op: DashboardtypesJSONPatchOperationDTO,
): string | undefined {
	const queries = op.value as Array<{
		spec: { plugin: { kind: string; spec: any } };
	}>;
	const { plugin } = queries[0].spec;
	const builderSpec =
		plugin.kind === 'signoz/CompositeQuery'
			? plugin.spec.queries[0].spec
			: plugin.spec;
	return builderSpec.filter?.expression;
}

function panels(
	map: Record<string, unknown>,
): DashboardtypesDashboardSpecDTOPanels {
	return map as DashboardtypesDashboardSpecDTOPanels;
}

describe('buildApplyVariableToPanelsPatch', () => {
	it('appends the clause to an existing filter (AND-joined)', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: compositePanel('env = "prod"') }),
			'service.name',
			'svc',
		);
		expect(ops).toHaveLength(1);
		expect(ops[0]).toMatchObject({
			op: 'replace',
			path: '/spec/panels/p1/spec/queries',
		});
		expect(expressionOf(ops[0])).toBe('env = "prod" AND service.name IN $svc');
	});

	it('sets the clause when the filter is empty', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: compositePanel('') }),
			'service.name',
			'svc',
		);
		expect(expressionOf(ops[0])).toBe('service.name IN $svc');
	});

	it('applies to a bare BuilderQuery (LIST) panel', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: listPanel('') }),
			'k8s.pod.name',
			'pod',
		);
		expect(expressionOf(ops[0])).toBe('k8s.pod.name IN $pod');
	});

	it('is idempotent — re-applying does not duplicate the clause', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: compositePanel('service.name IN $svc') }),
			'service.name',
			'svc',
		);
		expect(ops).toHaveLength(0);
	});

	it('only targets the requested panels', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: compositePanel(''), p2: compositePanel('') }),
			'service.name',
			'svc',
			['p2'],
		);
		expect(ops).toHaveLength(1);
		expect(ops[0].path).toBe('/spec/panels/p2/spec/queries');
	});

	it('skips PromQL panels (no builder filter)', () => {
		const ops = buildApplyVariableToPanelsPatch(
			panels({ p1: promqlPanel() }),
			'service.name',
			'svc',
		);
		expect(ops).toHaveLength(0);
	});

	it('returns nothing when attribute or name is missing', () => {
		expect(
			buildApplyVariableToPanelsPatch(
				panels({ p1: compositePanel('') }),
				'',
				'svc',
			),
		).toHaveLength(0);
	});
});

describe('buildSyncVariableToPanelsPatch', () => {
	it('adds to selected panels and removes from the rest', () => {
		const ops = buildSyncVariableToPanelsPatch(
			panels({
				p1: compositePanel('service.name IN $svc'), // has it, not selected → remove
				p2: compositePanel(''), // selected → add
				p3: compositePanel('service.name IN $svc'), // has it, selected → unchanged
			}),
			'service.name',
			'svc',
			['p2', 'p3'],
		);
		const byPath = Object.fromEntries(ops.map((op) => [op.path, op]));
		expect(Object.keys(byPath).sort()).toStrictEqual([
			'/spec/panels/p1/spec/queries',
			'/spec/panels/p2/spec/queries',
		]);
		expect(expressionOf(byPath['/spec/panels/p1/spec/queries'])).toBe('');
		expect(expressionOf(byPath['/spec/panels/p2/spec/queries'])).toBe(
			'service.name IN $svc',
		);
	});

	it('removing keeps other clauses intact', () => {
		const ops = buildSyncVariableToPanelsPatch(
			panels({ p1: compositePanel('env = "prod" AND service.name IN $svc') }),
			'service.name',
			'svc',
			[],
		);
		expect(expressionOf(ops[0])).toBe('env = "prod"');
	});
});

describe('getPanelIdsReferencingVariable', () => {
	it('returns only panels whose filter references the variable', () => {
		const ids = getPanelIdsReferencingVariable(
			panels({
				p1: compositePanel('service.name IN $svc'),
				p2: compositePanel('env = "prod"'),
				p3: listPanel('service.name IN $svc'),
			}),
			'service.name',
			'svc',
		);
		expect(ids.sort()).toStrictEqual(['p1', 'p3']);
	});
});
