import { useMemo } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { useAddTagFiltersToDashboard } from './useAddTagFiltersToDashboard';

interface DynamicVariableConfig {
	variableName: string;
	tagKey: {
		key: string;
		dataType: string;
		isColumn: boolean;
		isJSON?: boolean;
		type: string;
	};
	operator: string;
}

/**
 * A hook that adds dynamic variables to dashboard panels as tag filters
 *
 * @param dashboard The dashboard configuration
 * @param variableConfig Configuration for the dynamic variable to add
 * @param widgetIds Optional array of widget IDs to target specific widgets
 * @returns Updated dashboard with dynamic variables added as filters
 */
export const useAddDynamicVariableToPanels = (
	dashboard: Dashboard | undefined,
	variableConfig: DynamicVariableConfig,
	widgetIds?: string[],
): Dashboard | undefined => {
	// Create the tag filter based on the variable configuration
	const tagFilters = useMemo((): TagFilterItem[] => {
		if (!variableConfig) {
			return [];
		}

		const { variableName, tagKey, operator } = variableConfig;

		// Create a TagFilterItem that uses the variable as the value
		const filter: TagFilterItem = {
			id: uuid().slice(0, 8),
			key: tagKey as BaseAutocompleteData,
			op: operator,
			value: `$${variableName}`,
		};

		return [filter];
	}, [variableConfig]);

	// Use the existing hook to add these filters to the dashboard
	return useAddTagFiltersToDashboard(dashboard, tagFilters, widgetIds);
};

export default useAddDynamicVariableToPanels;
