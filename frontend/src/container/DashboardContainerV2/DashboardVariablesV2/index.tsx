import { useEffect, useMemo } from 'react';
import type {
	DashboardtypesListVariableSpecDTO,
	DashboardTextVariableSpecDTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

import { buildDependencyMap, detectCycle, topoSort } from './dependencyGraph';
import VariableSelector from './selectors/VariableSelector';
import { useVariableSelectionStore } from './state/selectionStore';

import '../../DashboardContainer/DashboardVariablesSelection/DashboardVariableSelection.styles.scss';

interface Props {
	dashboardId: string;
	variables: DashboardtypesVariableDTO[] | undefined;
}

function nameOf(v: DashboardtypesVariableDTO): string {
	return (
		(v.spec as DashboardtypesListVariableSpecDTO | DashboardTextVariableSpecDTO)
			?.name ?? ''
	);
}

function kindHint(v: DashboardtypesVariableDTO): 'list' | 'text' {
	return v.kind === 'TextVariable' ? 'text' : 'list';
}

function DashboardVariablesV2({ dashboardId, variables }: Props): JSX.Element | null {
	const hydrate = useVariableSelectionStore((s) => s.hydrate);

	// Build hints map (variable-name → list/text) so the store can decode the URL.
	const hints = useMemo<Record<string, 'list' | 'text'>>(() => {
		const out: Record<string, 'list' | 'text'> = {};
		(variables ?? []).forEach((v) => {
			const n = nameOf(v);
			if (n) out[n] = kindHint(v);
		});
		return out;
	}, [variables]);

	useEffect(() => {
		if (!dashboardId) return;
		hydrate(dashboardId, hints);
	}, [dashboardId, hints, hydrate]);

	// Sort variables in dependency order so dependent resolvers see fresh
	// selections from their parents. (Render order doesn't affect the React
	// Query cache but it does affect *visual* order.)
	const ordered = useMemo(() => {
		if (!variables?.length) return [];
		const deps = buildDependencyMap(variables);
		const cycle = detectCycle(deps);
		if (cycle.hasCycle) {
			// Render in the original order; the cycle is surfaced separately at save
			// time via validateDraft. Resolution will still execute; it just won't
			// converge.
			return variables;
		}
		const order = topoSort(deps);
		const byName: Record<string, DashboardtypesVariableDTO> = {};
		variables.forEach((v) => {
			const n = nameOf(v);
			if (n) byName[n] = v;
		});
		return order.map((n) => byName[n]).filter(Boolean);
	}, [variables]);

	if (!variables || variables.length === 0) return null;

	return (
		<div className="variables-container">
			{ordered.map((v) => (
				<VariableSelector key={nameOf(v)} variable={v} />
			))}
		</div>
	);
}

export default DashboardVariablesV2;
