import type {
	DashboardtypesDashboardSpecDTOPanels,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesQueryDTO,
	Querybuildertypesv5BuilderQuerySpecDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5QueryEnvelopeBuilderDTO,
} from 'api/generated/services/sigNoz.schemas';
import { cloneDeep } from 'lodash-es';

// Injects/removes a dynamic variable's filter (`attribute IN $name`) in panel
// builder queries as JSON-Patch ops. Only builder queries carry a filter.

function clauseFor(attribute: string, variableName: string): string {
	return `${attribute} IN $${variableName}`;
}

/** Runs `fn` on every builder-query spec in a panel's single query (Composite or bare Builder). */
function forEachBuilderSpec(
	queries: DashboardtypesQueryDTO[],
	fn: (spec: Querybuildertypesv5BuilderQuerySpecDTO) => void,
): void {
	const plugin = queries[0]?.spec?.plugin;
	if (!plugin?.spec) {
		return;
	}
	if (plugin.kind === 'signoz/CompositeQuery') {
		const composite = plugin.spec as Querybuildertypesv5CompositeQueryDTO;
		(composite.queries ?? [])
			.filter((envelope) => envelope.type === 'builder_query')
			.forEach((envelope) => {
				const { spec } = envelope as Querybuildertypesv5QueryEnvelopeBuilderDTO;
				if (spec) {
					fn(spec as Querybuildertypesv5BuilderQuerySpecDTO);
				}
			});
	} else if (plugin.kind === 'signoz/BuilderQuery') {
		fn(plugin.spec as Querybuildertypesv5BuilderQuerySpecDTO);
	}
}

/** Appends the clause to every builder query's filter. Returns whether anything changed. */
function addClause(queries: DashboardtypesQueryDTO[], clause: string): boolean {
	let changed = false;
	forEachBuilderSpec(queries, (spec) => {
		const existing = spec.filter?.expression?.trim();
		// Idempotent: a repeated apply must not stack duplicate clauses.
		if (existing?.includes(clause)) {
			return;
		}
		spec.filter = {
			expression: existing ? `${existing} AND ${clause}` : clause,
		};
		changed = true;
	});
	return changed;
}

/** Removes the managed clause (an ` AND `-joined part) from every builder filter. */
function removeClause(
	queries: DashboardtypesQueryDTO[],
	clause: string,
): boolean {
	let changed = false;
	forEachBuilderSpec(queries, (spec) => {
		const existing = spec.filter?.expression;
		if (!existing) {
			return;
		}
		const parts = existing
			.split(' AND ')
			.map((part) => part.trim())
			.filter(Boolean);
		const kept = parts.filter((part) => part !== clause);
		if (kept.length !== parts.length) {
			spec.filter = { expression: kept.join(' AND ') };
			changed = true;
		}
	});
	return changed;
}

/** Whether any builder query in the panel already carries the clause. */
function panelHasClause(
	queries: DashboardtypesQueryDTO[],
	clause: string,
): boolean {
	let has = false;
	forEachBuilderSpec(queries, (spec) => {
		if (spec.filter?.expression?.includes(clause)) {
			has = true;
		}
	});
	return has;
}

function replaceQueriesOp(
	panelId: string,
	queries: DashboardtypesQueryDTO[],
): DashboardtypesJSONPatchOperationDTO {
	return {
		op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
		path: `/spec/panels/${panelId}/spec/queries`,
		value: queries,
	};
}

/** Add-only: inject the variable's filter into the given panels (default: all). */
export function buildApplyVariableToPanelsPatch(
	panels: DashboardtypesDashboardSpecDTOPanels,
	attribute: string,
	variableName: string,
	targetPanelIds?: string[],
): DashboardtypesJSONPatchOperationDTO[] {
	if (!attribute || !variableName) {
		return [];
	}
	const clause = clauseFor(attribute, variableName);
	const ids = targetPanelIds ?? Object.keys(panels);

	const ops: DashboardtypesJSONPatchOperationDTO[] = [];
	ids.forEach((id) => {
		const panel = panels[id];
		if (!panel?.spec?.queries?.length) {
			return;
		}
		const queries = cloneDeep(panel.spec.queries);
		if (addClause(queries, clause)) {
			ops.push(replaceQueriesOp(id, queries));
		}
	});
	return ops;
}

/** Full sync: selected panels get the clause; every other panel has it removed. */
export function buildSyncVariableToPanelsPatch(
	panels: DashboardtypesDashboardSpecDTOPanels,
	attribute: string,
	variableName: string,
	selectedPanelIds: string[],
): DashboardtypesJSONPatchOperationDTO[] {
	if (!attribute || !variableName) {
		return [];
	}
	const clause = clauseFor(attribute, variableName);
	const selected = new Set(selectedPanelIds);

	const ops: DashboardtypesJSONPatchOperationDTO[] = [];
	Object.keys(panels).forEach((id) => {
		const panel = panels[id];
		if (!panel?.spec?.queries?.length) {
			return;
		}
		const queries = cloneDeep(panel.spec.queries);
		const changed = selected.has(id)
			? addClause(queries, clause)
			: removeClause(queries, clause);
		if (changed) {
			ops.push(replaceQueriesOp(id, queries));
		}
	});
	return ops;
}

/** Panel ids whose queries currently reference the variable — pre-populates the picker. */
export function getPanelIdsReferencingVariable(
	panels: DashboardtypesDashboardSpecDTOPanels,
	attribute: string,
	variableName: string,
): string[] {
	if (!attribute || !variableName) {
		return [];
	}
	const clause = clauseFor(attribute, variableName);
	return Object.keys(panels).filter((id) => {
		const queries = panels[id]?.spec?.queries;
		return queries?.length ? panelHasClause(queries, clause) : false;
	});
}
