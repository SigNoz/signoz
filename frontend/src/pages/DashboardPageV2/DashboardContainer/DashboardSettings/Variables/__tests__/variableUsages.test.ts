import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../variableFormModel';
import { findApplyUsages, findVariableUsages } from '../utils/variableUsages';

// Identity adapter so `spec.variables` can be plain form models in the test.
jest.mock('../variableAdapters', () => ({
	dtoToFormModel: (dto: unknown): unknown => dto,
}));

function variable(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), ...overrides };
}

function builderPanel(name: string, expression: string): unknown {
	return {
		spec: {
			display: { name },
			queries: [
				{
					spec: {
						plugin: { kind: 'signoz/BuilderQuery', spec: { filter: { expression } } },
					},
				},
			],
		},
	};
}

function promqlPanel(name: string, query: string): unknown {
	return {
		spec: {
			display: { name },
			queries: [
				{ spec: { plugin: { kind: 'signoz/PromQLQuery', spec: { query } } } },
			],
		},
	};
}

function dashboard(
	panels: Record<string, unknown>,
	variables: VariableFormModel[],
): DashboardtypesGettableDashboardV2DTO {
	return {
		spec: { panels, variables },
	} as unknown as DashboardtypesGettableDashboardV2DTO;
}

describe('findVariableUsages', () => {
	const dash = dashboard(
		{
			p1: builderPanel('Panel One', "service IN $svc AND env = 'prod'"),
			p2: promqlPanel('Panel Two', 'up{s="$svc"}'),
			p3: builderPanel('Unrelated', "env = 'prod'"),
		},
		[
			variable({ name: 'svc', type: 'QUERY' }),
			variable({
				name: 'other',
				type: 'QUERY',
				queryValue: 'SELECT x WHERE s = $svc',
			}),
			variable({ name: 'plain', type: 'QUERY', queryValue: 'SELECT y' }),
		],
	);

	it('finds panel (builder + promql) and variable usages, skipping unrelated ones', () => {
		const usages = findVariableUsages(dash, 'svc', 'rename', 'zone');
		const ids = usages.map((u) => u.id).sort();
		expect(ids).toStrictEqual(['panel:p1:0', 'panel:p2:0', 'variable:other:0']);
	});

	it('rewrites references for a rename across all kinds', () => {
		const usages = findVariableUsages(dash, 'svc', 'rename', 'zone');
		const byId = Object.fromEntries(usages.map((u) => [u.id, u.resultingText]));
		expect(byId['panel:p1:0']).toBe("service IN $zone AND env = 'prod'");
		expect(byId['panel:p2:0']).toBe('up{s="$zone"}');
		expect(byId['variable:other:0']).toBe('SELECT x WHERE s = $zone');
	});

	it('strips builder clauses on delete but leaves raw/variable queries for review', () => {
		const usages = findVariableUsages(dash, 'svc', 'delete');
		const byId = Object.fromEntries(usages.map((u) => [u.id, u.resultingText]));
		// Builder: the clause referencing $svc is dropped.
		expect(byId['panel:p1:0']).toBe("env = 'prod'");
		// Raw PromQL + variable query: unchanged (user edits).
		expect(byId['panel:p2:0']).toBe('up{s="$svc"}');
		expect(byId['variable:other:0']).toBe('SELECT x WHERE s = $svc');
	});

	it('returns nothing for an unreferenced variable', () => {
		expect(findVariableUsages(dash, 'nope', 'delete')).toStrictEqual([]);
	});
});

describe('findApplyUsages', () => {
	const dash = dashboard(
		{
			empty: builderPanel('Empty', ''),
			ored: builderPanel('Ored', "a = 'x' OR b = 'y'"),
			has: builderPanel('Has it', 'k8s.pod.name IN $pod'),
			prom: promqlPanel('Prom', 'up'),
		},
		[],
	);

	it('appends the clause to selected builder panels, parenthesising an OR', () => {
		const usages = findApplyUsages(dash, 'k8s.pod.name', 'pod', 'pod', [
			'empty',
			'ored',
		]);
		const byId = Object.fromEntries(usages.map((u) => [u.id, u.resultingText]));
		expect(byId['panel:empty:0']).toBe('k8s.pod.name IN $pod');
		expect(byId['panel:ored:0']).toBe(
			"(a = 'x' OR b = 'y') AND k8s.pod.name IN $pod",
		);
	});

	it('skips a selected panel that already carries the clause (idempotent)', () => {
		const usages = findApplyUsages(dash, 'k8s.pod.name', 'pod', 'pod', ['has']);
		expect(usages).toStrictEqual([]);
	});

	it('removes the clause from an unselected panel that has it', () => {
		const usages = findApplyUsages(dash, 'k8s.pod.name', 'pod', 'pod', ['empty']);
		const has = usages.find((u) => u.id === 'panel:has:0');
		expect(has?.resultingText).toBe('');
	});

	it('never touches PromQL panels', () => {
		const usages = findApplyUsages(dash, 'k8s.pod.name', 'pod', 'pod', ['prom']);
		expect(usages.some((u) => u.sourceId === 'prom')).toBe(false);
	});
});
