import { useMemo } from 'react';
import {
	IDashboardVariable,
	TVariableQueryType,
} from 'types/api/dashboard/getAll';

import { useDashboardVariables } from './useDashboardVariables';

export function useDashboardVariablesByType(
	variableType: TVariableQueryType,
	returnType: 'values',
): IDashboardVariable[];
export function useDashboardVariablesByType(
	variableType: TVariableQueryType,
	returnType?: 'entries',
): [string, IDashboardVariable][];
export function useDashboardVariablesByType(
	variableType: TVariableQueryType,
	returnType?: 'values' | 'entries',
): IDashboardVariable[] | [string, IDashboardVariable][] {
	const { dashboardVariables } = useDashboardVariables();

	return useMemo(() => {
		const entries = Object.entries(dashboardVariables || {}).filter(
			(entry): entry is [string, IDashboardVariable] =>
				Boolean(entry[1].name) && entry[1].type === variableType,
		);
		return returnType === 'values' ? entries.map(([, value]) => value) : entries;
	}, [dashboardVariables, variableType, returnType]);
}
