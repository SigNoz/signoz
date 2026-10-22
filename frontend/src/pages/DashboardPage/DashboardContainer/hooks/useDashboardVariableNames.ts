import { useMemo } from 'react';
import { dtoToFormModel } from 'pages/DashboardPage/DashboardContainer/DashboardSettings/Variables/variableAdapters';

import { useDashboardFetchRequired } from './useDashboardFetchRequired';

export function useDashboardVariableNames(): string[] {
	const { variables } = useDashboardFetchRequired();

	return useMemo(
		() =>
			variables
				.map((dto) => dtoToFormModel(dto).name)
				.filter((name): name is string => !!name),
		[variables],
	);
}
