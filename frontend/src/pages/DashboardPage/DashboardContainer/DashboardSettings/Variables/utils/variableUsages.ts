import type {
	DashboardtypesGettableDashboardV2DTO,
	Querybuildertypesv5QueryEnvelopeDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	appendAndClause,
	removeVariableFromExpression,
} from 'components/QueryBuilderV2/utils';
import {
	rewriteVariableReferences,
	textContainsVariableReference,
} from 'lib/dashboardVariables/variableReference';

import { toQueryEnvelopes } from '../../../queryV5/buildQueryRangeRequest';
import { dtoToFormModel } from '../variableAdapters';

/** The kind of query text a variable is referenced from. */
export type VariableUsageKind =
	| 'builder'
	| 'promql'
	| 'clickhouse'
	| 'variable';

export type VariableImpactMode = 'rename' | 'delete' | 'apply';

/**
 * One place a variable is referenced — a panel query's builder filter expression,
 * a PromQL/ClickHouse query string, or another variable's query definition. Each
 * usage is a single editable text field: `currentText` is what exists today,
 * `resultingText` is the proposed rewrite (rename) or removal (delete) the user
 * can review and edit before applying.
 */
export interface VariableUsage {
	/** Stable key: `${sourceType}:${sourceId}:${envelopeIndex}`. */
	id: string;
	sourceType: 'panel' | 'variable';
	/** Panel id or referencing variable's name. */
	sourceId: string;
	/** Human label: panel display name or `$variableName`. */
	sourceLabel: string;
	kind: VariableUsageKind;
	/** Index into the panel's query envelopes (0 for a variable definition). */
	envelopeIndex: number;
	currentText: string;
	resultingText: string;
}

/** The reference-bearing text + kind for one query envelope, if any. */
function envelopeReferenceText(
	envelope: Querybuildertypesv5QueryEnvelopeDTO,
): { kind: VariableUsageKind; text: string } | null {
	const spec = envelope.spec as
		| { query?: string; filter?: { expression?: string } }
		| undefined;
	if (envelope.type === 'builder_query') {
		const text = spec?.filter?.expression;
		return typeof text === 'string' ? { kind: 'builder', text } : null;
	}
	if (envelope.type === 'promql') {
		return typeof spec?.query === 'string'
			? { kind: 'promql', text: spec.query }
			: null;
	}
	if (envelope.type === 'clickhouse_sql') {
		return typeof spec?.query === 'string'
			? { kind: 'clickhouse', text: spec.query }
			: null;
	}
	return null;
}

/** The proposed text after a rename (rewrite) or delete (best-effort removal). */
function computeResultingText(
	kind: VariableUsageKind,
	text: string,
	variableName: string,
	mode: VariableImpactMode,
	newName: string,
): string {
	if (mode === 'rename') {
		return rewriteVariableReferences(text, variableName, newName);
	}
	// delete: only builder filter clauses can be safely auto-stripped; raw PromQL/
	// ClickHouse and variable queries are left for the user to edit.
	return kind === 'builder'
		? removeVariableFromExpression(text, variableName)
		: text;
}

/**
 * Finds every usage of `variableName` across the dashboard's panel queries
 * (builder / PromQL / ClickHouse) and other variables' query definitions, with a
 * proposed `resultingText` for the given mode. Consumed by the impact dialog that
 * blocks a rename/delete until the user resolves each usage.
 */
export function findVariableUsages(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	variableName: string,
	mode: VariableImpactMode,
	newName = '',
): VariableUsage[] {
	if (!variableName) {
		return [];
	}
	const usages: VariableUsage[] = [];
	const spec = dashboard.spec;

	Object.entries(spec.panels ?? {}).forEach(([panelId, panel]) => {
		const queries = panel?.spec?.queries;
		if (!queries?.length) {
			return;
		}
		toQueryEnvelopes(queries).forEach((envelope, index) => {
			const ref = envelopeReferenceText(envelope);
			if (!ref || !textContainsVariableReference(ref.text, variableName)) {
				return;
			}
			usages.push({
				id: `panel:${panelId}:${index}`,
				sourceType: 'panel',
				sourceId: panelId,
				sourceLabel: panel.spec?.display?.name || panelId,
				kind: ref.kind,
				envelopeIndex: index,
				currentText: ref.text,
				resultingText: computeResultingText(
					ref.kind,
					ref.text,
					variableName,
					mode,
					newName,
				),
			});
		});
	});

	(spec.variables ?? []).map(dtoToFormModel).forEach((variable) => {
		if (
			variable.name === variableName ||
			variable.type !== 'QUERY' ||
			!variable.queryValue ||
			!textContainsVariableReference(variable.queryValue, variableName)
		) {
			return;
		}
		usages.push({
			id: `variable:${variable.name}:0`,
			sourceType: 'variable',
			sourceId: variable.name,
			sourceLabel: `$${variable.name}`,
			kind: 'variable',
			envelopeIndex: 0,
			currentText: variable.queryValue,
			resultingText: computeResultingText(
				'variable',
				variable.queryValue,
				variableName,
				mode,
				newName,
			),
		});
	});

	return usages;
}

// `matchName` is the name in the current query text (the old name during a
// simultaneous rename); `injectName` is written into newly added clauses. Equal
// outside of a rename.
export function findApplyUsages(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	attribute: string,
	injectName: string,
	matchName: string,
	selectedPanelIds: string[],
): VariableUsage[] {
	if (!attribute || !injectName) {
		return [];
	}
	const clause = `${attribute} IN $${injectName}`;
	const existingClause = `${attribute} IN $${matchName}`;
	const selected = new Set(selectedPanelIds);
	const usages: VariableUsage[] = [];

	Object.entries(dashboard.spec.panels ?? {}).forEach(([panelId, panel]) => {
		const queries = panel?.spec?.queries;
		if (!queries?.length) {
			return;
		}
		toQueryEnvelopes(queries).forEach((envelope, index) => {
			const pushUsage = (
				kind: VariableUsageKind,
				currentText: string,
				resultingText: string,
			): void => {
				usages.push({
					id: `panel:${panelId}:${index}`,
					sourceType: 'panel',
					sourceId: panelId,
					sourceLabel: panel.spec?.display?.name || panelId,
					kind,
					envelopeIndex: index,
					currentText,
					resultingText,
				});
			};

			if (envelope.type === 'builder_query') {
				const spec = envelope.spec as
					| { filter?: { expression?: string } }
					| undefined;
				const current = spec?.filter?.expression ?? '';
				if (selected.has(panelId)) {
					// Already carries the clause (under either name) — a rename usage, if
					// any, fixes the name; don't append a duplicate.
					if (current.includes(clause) || current.includes(existingClause)) {
						return;
					}
					pushUsage('builder', current, appendAndClause(current, clause));
				} else {
					const next = removeVariableFromExpression(current, matchName);
					if (next !== current) {
						pushUsage('builder', current, next);
					}
				}
				return;
			}

			// PromQL/ClickHouse can't carry the managed clause — never auto-inject or
			// remove. Selected panels still get an editable row defaulting to the
			// current text, unless the query already references the variable.
			if (!selected.has(panelId)) {
				return;
			}
			const ref = envelopeReferenceText(envelope);
			if (!ref) {
				return;
			}
			if (
				textContainsVariableReference(ref.text, injectName) ||
				textContainsVariableReference(ref.text, matchName)
			) {
				return;
			}
			pushUsage(ref.kind, ref.text, ref.text);
		});
	});

	return usages;
}

// Cheap yes/no check for the "Apply to all" disabled state: does every panel query
// already reference the variable? Plain string checks — no ANTLR, no rewriting.
export function isVariableAppliedToAllPanels(
	dashboard: DashboardtypesGettableDashboardV2DTO,
	attribute: string,
	variableName: string,
): boolean {
	if (!attribute || !variableName) {
		return false;
	}
	const clause = `${attribute} IN $${variableName}`;
	const panels = dashboard.spec.panels ?? {};
	return Object.values(panels).every((panel) => {
		const queries = panel?.spec?.queries;
		if (!queries?.length) {
			return true;
		}
		return toQueryEnvelopes(queries).every((envelope) => {
			if (envelope.type === 'builder_query') {
				const spec = envelope.spec as
					| { filter?: { expression?: string } }
					| undefined;
				return (spec?.filter?.expression ?? '').includes(clause);
			}
			const ref = envelopeReferenceText(envelope);
			return ref ? textContainsVariableReference(ref.text, variableName) : true;
		});
	});
}
