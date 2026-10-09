import type {
	DashboardtypesDashboardSpecDTOPanels,
	DashboardtypesQueryDTO,
	Querybuildertypesv5BuilderQuerySpecDTO,
	Querybuildertypesv5CompositeQueryDTO,
	Querybuildertypesv5QueryEnvelopeBuilderDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	isBuilderOrAIEnvelope,
	isBuilderOrAIPluginKind,
} from '../../../queryV5/builderEnvelope';

function clauseFor(attribute: string, variableName: string): string {
	return `${attribute} IN $${variableName}`;
}

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
			.filter(isBuilderOrAIEnvelope)
			.forEach((envelope) => {
				const { spec } = envelope as Querybuildertypesv5QueryEnvelopeBuilderDTO;
				if (spec) {
					fn(spec as Querybuildertypesv5BuilderQuerySpecDTO);
				}
			});
	} else if (isBuilderOrAIPluginKind(plugin.kind)) {
		fn(plugin.spec as Querybuildertypesv5BuilderQuerySpecDTO);
	}
}

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
