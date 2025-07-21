import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
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

	const updateFilters = (filters: TagFilter): TagFilter => {
		const startsWithRegex = /^(k8s|cloud|host|deployment)/;
		const containsRegex = /(env|service|file|container|tenant)/;

		return {
			...filters,
			items: filters.items.filter(
				(filterItem) =>
					filterItem.key?.key &&
					(startsWithRegex.test(filterItem.key.key) ||
						containsRegex.test(filterItem.key.key)),
			),
		};
	};

	const data: Query = {
		...updatedAllQueriesOperator,
		builder: {
			...updatedAllQueriesOperator.builder,
			queryData: updatedAllQueriesOperator.builder.queryData.map((item) => {
				const filters = {
					...item.filters,
					items: [...item.filters.items, ...resourcesFilters],
				};

				const updatedFilters = updateFilters(filters);

				return {
					...item,
					filters: updatedFilters,
				};
			}),
		},
	};

	return data;
};

export default useInitialQuery;
