import type {
	DashboardtypesGettableDashboardV2DTO,
	Querybuildertypesv5QueryEnvelopeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { removeVariableFromExpression } from 'components/QueryBuilderV2/utils';
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

/** Whether the impact is a rename (rewrite refs) or a delete (remove refs). */
export type VariableImpactMode = 'rename' | 'delete';

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
