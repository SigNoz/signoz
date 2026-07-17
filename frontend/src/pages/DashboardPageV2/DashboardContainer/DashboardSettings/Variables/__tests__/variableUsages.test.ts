import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../variableFormModel';
import { findVariableUsages } from '../utils/variableUsages';

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
