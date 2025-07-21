import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getFiltersFromResources } from './utils';

const RESOURCE_STARTS_WITH_REGEX = /^(k8s|cloud|host|deployment)/; // regex to filter out resources that start with the specified keywords
const RESOURCE_CONTAINS_REGEX = /(env|service|file|container|tenant)/; // regex to filter out resources that contains the spefied keywords

const useInitialQuery = (log: ILog): Query => {
	const { updateAllQueriesOperators } = useQueryBuilder();
	const resourcesFilters = getFiltersFromResources(log.resources_string);

	const updatedAllQueriesOperator = updateAllQueriesOperators(
		initialQueriesMap.logs,
		PANEL_TYPES.LIST,
		DataSource.LOGS,
	);

	const updateFilters = (filters: TagFilter): TagFilter => ({
		...filters,
		items: filters.items.filter(
			(filterItem) =>
				filterItem.key?.key &&
				(RESOURCE_STARTS_WITH_REGEX.test(filterItem.key.key) ||
					RESOURCE_CONTAINS_REGEX.test(filterItem.key.key)),
		),
	});

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
