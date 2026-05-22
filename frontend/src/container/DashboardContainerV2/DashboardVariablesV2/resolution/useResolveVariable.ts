import { useMemo } from 'react';
import type {
	DashboardtypesListVariableSpecDTO,
	DashboardtypesVariableDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useVariableSelectionStore } from '../state/selectionStore';
import { applyCapturingRegexp } from './capturingRegexp';
import { applySort } from './sorting';
import { useCustomResolver } from './useCustomResolver';
import { useDynamicResolver } from './useDynamicResolver';
import { useQueryResolver } from './useQueryResolver';
import { idle, success, type ResolvedValues } from './types';

interface UseResolveVariableArgs {
	variable: DashboardtypesVariableDTO;
}

/**
 * Routes a variable to the correct resolver hook and applies the V2
 * post-processing pipeline:
 *
 *   raw values → capturingRegexp → sort → final list
 *
 * Text variables short-circuit since they don't have a value list.
 */
export function useResolveVariable({
	variable,
}: UseResolveVariableArgs): ResolvedValues {
	const selections = useVariableSelectionStore((s) => s.selections);

	// Read all fields up front so the React Query / hook order is stable
	// across renders (hooks must not be called conditionally).
	const isText = variable.kind === 'TextVariable';
	const listSpec = (variable.spec as DashboardtypesListVariableSpecDTO) ?? {};
	const pluginKind = listSpec.plugin?.kind;
	const pluginSpec = (listSpec.plugin?.spec as Record<string, unknown> | undefined) ?? {};

	const name = listSpec?.name ?? '';
	const customValue = (pluginSpec.customValue as string) ?? '';
	const queryValue = (pluginSpec.queryValue as string) ?? '';
	const dynName = (pluginSpec.name as string) ?? '';
	const dynSignal = pluginSpec.signal as TelemetrytypesSignalDTO | undefined;

	const customRes = useCustomResolver(
		pluginKind === 'signoz/CustomVariable' ? customValue : '',
	);
	const dynRes = useDynamicResolver(
		pluginKind === 'signoz/DynamicVariable' ? dynName : '',
		dynSignal,
	);
	const queryRes = useQueryResolver({
		variableName: name,
		queryValue: pluginKind === 'signoz/QueryVariable' ? queryValue : '',
		selections,
		enabled: pluginKind === 'signoz/QueryVariable',
	});

	const raw: ResolvedValues = useMemo(() => {
		if (isText) return success([]);
		if (pluginKind === 'signoz/CustomVariable') return customRes;
		if (pluginKind === 'signoz/DynamicVariable') return dynRes;
		if (pluginKind === 'signoz/QueryVariable') return queryRes;
		return idle;
	}, [isText, pluginKind, customRes, dynRes, queryRes]);

	return useMemo(() => {
		if (raw.status !== 'success') return raw;
		const afterRegex = applyCapturingRegexp(raw.values, listSpec.capturingRegexp);
		const afterSort = applySort(afterRegex, listSpec.sort);
		return success(afterSort);
	}, [raw, listSpec.capturingRegexp, listSpec.sort]);
}
