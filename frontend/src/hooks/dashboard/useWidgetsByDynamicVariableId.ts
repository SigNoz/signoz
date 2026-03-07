import { useMemo } from 'react';
import { PANEL_GROUP_TYPES } from 'constants/queryBuilder';
import { createDynamicVariableToWidgetsMap } from 'hooks/dashboard/utils';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { Widgets } from 'types/api/dashboard/getAll';

import { useDashboardVariablesByType } from './useDashboardVariablesByType';

/**
 * Hook to get a map of dynamic variable IDs to widget IDs that use them.
 * This is useful for determining which widgets need to be refreshed when a dynamic variable changes.
 */
export function useWidgetsByDynamicVariableId(): Record<string, string[]> {
	const dynamicVariables = useDashboardVariablesByType('DYNAMIC', 'values');
	const { selectedDashboard } = useDashboard();

	return useMemo(() => {
		const widgets =
			selectedDashboard?.data?.widgets?.filter(
				(widget) => widget.panelTypes !== PANEL_GROUP_TYPES.ROW,
			) || [];

		return createDynamicVariableToWidgetsMap(
			dynamicVariables,
			widgets as Widgets[],
		);
	}, [selectedDashboard, dynamicVariables]);
}
