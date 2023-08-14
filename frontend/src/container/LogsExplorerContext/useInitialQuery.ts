import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ILog } from 'types/api/logs/log';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getFiltersFromResources } from './utils';

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
			queryData: updatedAllQueriesOperator.builder.queryData.map((item) => ({
				...item,
				filters: {
					...item.filters,
					items: [...item.filters.items, ...resourcesFilters],
				},
			})),
		},
	};

	return data;
};

export default useInitialQuery;
