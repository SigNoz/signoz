import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ILog } from 'types/api/logs/log';
import {
	Query,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getFiltersFromResources } from './utils';

const FALLBACK_STARTS_WITH_REGEX = /^(k8s|cloud|host|deployment)/; // regex to filter out resources that start with the specified keywords
const FALLBACK_CONTAINS_REGEX = /(env|service|file|container|tenant)/; // regex to filter out resources that contains the specified keywords
// Priority configuration
const PRIORITY_CATEGORIES = [
	['k8s.pod.uid', 'k8s.pod.name', 'k8s.deployment.name'],
	['cloud.resource_id', 'cloud.provider', 'cloud.region'],
	['host.id', 'host.name'],
	['container.id', 'container.name'],
];

const SERVICE_AND_ENVIRONMENT_KEYS = [
	'service.name',
	'deployment.environment',
	'env',
	'environment',
];
const useInitialQuery = (log: ILog): Query => {
	const { updateAllQueriesOperators } = useQueryBuilder();
	const resourcesFilters = getFiltersFromResources(log.resources_string);

	const updatedAllQueriesOperator = updateAllQueriesOperators(
		initialQueriesMap.logs,
		PANEL_TYPES.LIST,
		DataSource.LOGS,
	);

	const isServiceOrEnvironmentAttribute = (key: string): boolean =>
		SERVICE_AND_ENVIRONMENT_KEYS.includes(key);

	const getServiceAndEnvironmentFilterItems = (
		items: TagFilterItem[],
	): TagFilterItem[] =>
		items.filter(
			(item) => item.key?.key && isServiceOrEnvironmentAttribute(item.key.key),
		);

	// Check each category in priority order (k8s → cloud → host → container)
	const findFirstPriorityItem = (
		items: TagFilterItem[],
	): TagFilterItem | undefined =>
		PRIORITY_CATEGORIES.flatMap((categoryPriorities) =>
			categoryPriorities.map((priorityKey) =>
				items.find((item) => item.key?.key === priorityKey),
			),
		).find(Boolean);

	const getFallbackItems = (items: TagFilterItem[]): TagFilterItem[] =>
		items.filter((item) => {
			if (!item.key?.key) return false;

			const { key } = item.key;

			return (
				FALLBACK_STARTS_WITH_REGEX.test(key) || FALLBACK_CONTAINS_REGEX.test(key)
			);
		});

	const updateFilters = (filters: TagFilter): TagFilter => {
		const availableItems = filters.items;
		const selectedItems: TagFilterItem[] = [];

		// Step 1: Always include service.name and environment attributes
		selectedItems.push(...getServiceAndEnvironmentFilterItems(availableItems));

		// Step 2: Find first category with attributes and pick first available
		const priorityItem = findFirstPriorityItem(availableItems);
		if (priorityItem) {
			selectedItems.push(priorityItem);
		} else {
			// Step 3: Fallback to current regex logic (only if no priority items found)
			const fallbackItems = getFallbackItems(availableItems).filter(
				(item) => !isServiceOrEnvironmentAttribute(item.key?.key || ''),
			);
			if (fallbackItems.length > 0) {
				selectedItems.push(...fallbackItems);
			}
		}

		return {
			...filters,
			items: selectedItems,
		};
	};

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
