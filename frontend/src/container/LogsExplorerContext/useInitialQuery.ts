import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { initialQueriesMap } from 'constants/queryBuilder';
import { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { ILog } from 'types/api/logs/log';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getFiltersFromResources, updateFilters } from './utils';

const useInitialQuery = (log: ILog): Query => {
	const { updateAllQueriesOperators } = useQueryBuilder();
	const resourcesFilters = getFiltersFromResources(log.resources_string);

	const updatedAllQueriesOperator = updateAllQueriesOperators(
		initialQueriesMap.logs,
		PANEL_TYPES.LIST,
		DataSource.LOGS,
	);

	const data: Query = {
		...updatedAllQueriesOperator,
		builder: {
			...updatedAllQueriesOperator.builder,
			queryData: updatedAllQueriesOperator.builder.queryData.map((item) => {
				const filters = {
					...item.filters,
					items: [...(item.filters?.items || []), ...resourcesFilters],
					op: item.filters?.op || 'AND',
				};
				const updatedFilters = updateFilters(filters);
				const { expression } = convertFiltersToExpression(updatedFilters);
				return {
					...item,
					filter: {
						expression,
					},
					filters: updatedFilters,
				};
			}),
		},
	};

	return data;
};

export default useInitialQuery;
