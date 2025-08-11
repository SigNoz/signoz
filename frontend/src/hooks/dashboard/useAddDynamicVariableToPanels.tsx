import { getFiltersFromKeyValue } from 'pages/Celery/CeleryOverview/CeleryOverviewUtils';
import { useCallback } from 'react';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { addTagFiltersToDashboard } from '../../container/NewDashboard/DashboardSettings/Variables/addTagFiltersToDashboard';

/**
 * A hook that returns a function to add dynamic variables to dashboard panels as tag filters.
 *
 * @returns A function that, when given a dashboard and variable config, returns the updated dashboard.
 */
export const useAddDynamicVariableToPanels = (): ((
	dashboard: Dashboard | undefined,
	variableConfig: IDashboardVariable,
) => Dashboard | undefined) =>
	useCallback(
		(
			dashboard: Dashboard | undefined,
			variableConfig: IDashboardVariable,
		): Dashboard | undefined => {
			if (!variableConfig) return dashboard;

			const {
				dynamicVariablesAttribute,
				name,
				dynamicVariablesWidgetIds,
			} = variableConfig;

			const tagFilters: TagFilterItem[] = [
				getFiltersFromKeyValue(dynamicVariablesAttribute || '', `$${name}`),
			];

			return addTagFiltersToDashboard(
				dashboard,
				tagFilters,
				dynamicVariablesWidgetIds,
			);
		},
		[],
	);

export default useAddDynamicVariableToPanels;
