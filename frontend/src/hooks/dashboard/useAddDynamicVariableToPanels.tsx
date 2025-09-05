import { addTagFiltersToDashboard } from 'container/NewDashboard/DashboardSettings/Variables/addTagFiltersToDashboard';
import { useCallback } from 'react';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { getFiltersFromKeyValue } from './utils';

/**
 * A hook that returns a function to add dynamic variables to dashboard panels as tag filters.
 *
 * @returns A function that, when given a dashboard and variable config, returns the updated dashboard.
 */
export const useAddDynamicVariableToPanels = (): ((
	dashboard: Dashboard | undefined,
	variableConfig: IDashboardVariable,
	widgetIds?: string[],
	applyToAll?: boolean,
) => Dashboard | undefined) =>
	useCallback(
		(
			dashboard: Dashboard | undefined,
			variableConfig: IDashboardVariable,
			widgetIds?: string[],
			applyToAll?: boolean,
		): Dashboard | undefined => {
			if (!variableConfig) return dashboard;

			const { dynamicVariablesAttribute, name } = variableConfig;

			const tagFilters: TagFilterItem = getFiltersFromKeyValue(
				dynamicVariablesAttribute || '',
				`$${name}`,
				'',
				'IN',
			);

			return addTagFiltersToDashboard(
				dashboard,
				tagFilters,
				widgetIds,
				applyToAll,
			);
		},
		[],
	);

export default useAddDynamicVariableToPanels;
