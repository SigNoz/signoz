import type {
	DashboardtypesListVariableSpecDTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

import { referencedVariables } from './substitution';

/**
 * Extracts the strings on a variable that may contain `$var` references —
 * i.e. the dependency edges out of this variable.
 *
 * Currently only QUERY variables produce dependencies (their `queryValue`
 * may reference other variables). CUSTOM and DYNAMIC plugin specs don't
 * embed substitutable strings, and TEXT variables are leaf nodes.
 */
function dependencyStrings(dto: DashboardtypesVariableDTO): string[] {
	if (dto.kind !== 'ListVariable') return [];
	const spec = dto.spec as DashboardtypesListVariableSpecDTO;
	const pluginKind = spec?.plugin?.kind;
	const pluginSpec = spec?.plugin?.spec as Record<string, unknown> | undefined;
	if (pluginKind === 'signoz/QueryVariable') {
		return [String(pluginSpec?.queryValue ?? '')];
	}
	return [];
}

function nameOf(dto: DashboardtypesVariableDTO): string {
	return (dto.spec as { name?: string })?.name ?? '';
}

/**
 * Direct dependencies for each variable (name → set of names it references).
 */
export function buildDependencyMap(
	variables: DashboardtypesVariableDTO[],
): Record<string, Set<string>> {
	const knownNames = new Set(variables.map(nameOf).filter(Boolean));
	const deps: Record<string, Set<string>> = {};
	variables.forEach((v) => {
		const name = nameOf(v);
		if (!name) return;
		const refs = new Set<string>();
		dependencyStrings(v).forEach((s) => {
			referencedVariables(s).forEach((ref) => {
				if (ref !== name && knownNames.has(ref)) refs.add(ref);
			});
		});
		deps[name] = refs;
	});
	return deps;
}

export interface CycleResult {
	hasCycle: boolean;
	cycle?: string[];
}

/**
 * Detect a cycle via DFS; returns the participating names in traversal order.
 * Used at save time and to guard re-resolution.
 */
export function detectCycle(
	deps: Record<string, Set<string>>,
): CycleResult {
	const WHITE = 0;
	const GRAY = 1;
	const BLACK = 2;
	const color: Record<string, number> = {};
	const stack: string[] = [];
	const names = Object.keys(deps);
	names.forEach((n) => {
		color[n] = WHITE;
	});

	function visit(node: string): string[] | null {
		color[node] = GRAY;
		stack.push(node);
		for (const next of deps[node] ?? []) {
			if (color[next] === GRAY) {
				const idx = stack.indexOf(next);
				return stack.slice(idx).concat(next);
			}
			if (color[next] === WHITE) {
				const found = visit(next);
				if (found) return found;
			}
		}
		stack.pop();
		color[node] = BLACK;
		return null;
	}

	for (const n of names) {
		if (color[n] === WHITE) {
			const cycle = visit(n);
			if (cycle) return { hasCycle: true, cycle };
		}
	}
	return { hasCycle: false };
}

/**
 * Kahn's algorithm — returns variable names in dependency order
 * (dependencies first). If there's a cycle the result excludes the
 * participating nodes; combine with `detectCycle` for validation.
 */
export function topoSort(
	deps: Record<string, Set<string>>,
): string[] {
	const incoming: Record<string, number> = {};
	const downstream: Record<string, string[]> = {};
	Object.keys(deps).forEach((n) => {
		incoming[n] = 0;
		downstream[n] = [];
	});
	Object.entries(deps).forEach(([n, refs]) => {
		refs.forEach((ref) => {
			incoming[n] += 1;
			downstream[ref] = downstream[ref] ?? [];
			downstream[ref].push(n);
		});
	});

	const queue: string[] = Object.keys(incoming).filter((n) => incoming[n] === 0);
	const out: string[] = [];
	while (queue.length > 0) {
		const n = queue.shift() as string;
		out.push(n);
		(downstream[n] ?? []).forEach((next) => {
			incoming[next] -= 1;
			if (incoming[next] === 0) queue.push(next);
		});
	}
	return out;
}
