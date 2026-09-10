import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesQueryDTO,
	Querybuildertypesv5CompositeQueryDTO,
} from 'api/generated/services/sigNoz.schemas';
import { cloneDeep } from 'lodash-es';

import { formModelToDto } from '../variableAdapters';
import type { VariableFormModel } from '../variableFormModel';
import { buildVariablesPatch } from './variablePatchOps';
import type { VariableUsage, VariableUsageKind } from './variableUsages';

/** Minimal writable view of an envelope spec's reference-bearing fields. */
interface WritableSpec {
	query?: string;
	filter?: { expression?: string };
}

/** Writes the resolved text into the spec's builder filter or raw query field. */
function writeSpecText(
	spec: WritableSpec,
	kind: VariableUsageKind,
	text: string,
): void {
	if (kind === 'builder') {
		spec.filter = { ...(spec.filter ?? {}), expression: text };
	} else {
		spec.query = text;
	}
}

/** Applies one panel usage's edited text into a (cloned) queries array in place. */
function applyPanelUsage(
	queries: DashboardtypesQueryDTO[],
	usage: VariableUsage,
): void {
	const plugin = queries[0]?.spec?.plugin;
	if (!plugin?.spec) {
		return;
	}
	if (plugin.kind === 'signoz/CompositeQuery') {
		const composite = plugin.spec as Querybuildertypesv5CompositeQueryDTO;
		const envelope = (composite.queries ?? [])[usage.envelopeIndex];
		if (envelope?.spec) {
			writeSpecText(
				envelope.spec as WritableSpec,
				usage.kind,
				usage.resultingText,
			);
		}
	} else {
		// Bare BuilderQuery / PromQLQuery / ClickHouseSQL — the plugin spec is the
		// single envelope (index 0).
		writeSpecText(plugin.spec as WritableSpec, usage.kind, usage.resultingText);
	}
}

/**
 * Applies the variable-definition usages' edited text back into the matching
 * variable's `queryValue`, so a renamed/deleted variable's references inside
 * another query variable are updated alongside the panels.
 */
export function applyVariableQueryEdits(
	variables: VariableFormModel[],
	usages: VariableUsage[],
): VariableFormModel[] {
	const edits = new Map(
		usages
			.filter((usage) => usage.sourceType === 'variable')
			.map((usage) => [usage.sourceId, usage.resultingText]),
	);
	if (edits.size === 0) {
		return variables;
	}
	return variables.map((variable) =>
		edits.has(variable.name)
			? { ...variable, queryValue: edits.get(variable.name) as string }
			: variable,
	);
}

/**
 * Builds the atomic JSON-Patch for a variable rename/delete impact: replaces the
 * whole variables array (which the caller has already updated for the rename/
 * delete and any variable-query edits) and replaces each touched panel's queries
 * with the user's resolved text.
 */
export function buildVariableImpactPatch(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	nextVariables: VariableFormModel[],
	usages: VariableUsage[],
): DashboardtypesJSONPatchOperationDTO[] {
	const ops: DashboardtypesJSONPatchOperationDTO[] = [
		...buildVariablesPatch(nextVariables.map(formModelToDto)),
	];

	const panels = dashboard.spec.panels ?? {};
	const byPanel = new Map<string, VariableUsage[]>();
	usages
		.filter((usage) => usage.sourceType === 'panel')
		.forEach((usage) => {
			const list = byPanel.get(usage.sourceId) ?? [];
			list.push(usage);
			byPanel.set(usage.sourceId, list);
		});

	byPanel.forEach((list, panelId) => {
		const panel = panels[panelId];
		if (!panel?.spec?.queries?.length) {
			return;
		}
		const queries = cloneDeep(panel.spec.queries);
		list.forEach((usage) => applyPanelUsage(queries, usage));
		ops.push({
			op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
			path: `/spec/panels/${panelId}/spec/queries`,
			value: queries,
		});
	});

	return ops;
}
