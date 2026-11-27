import { OPERATORS } from 'constants/queryBuilder';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';
import { getSemconvRename } from 'utils/semconv';

const FALLBACK_STARTS_WITH_REGEX = /^(k8s|cloud|host|deployment)/; // regex to filter out resources that start with the specified keywords
const FALLBACK_CONTAINS_REGEX = /(env|service|file|container|tenant)/; // regex to filter out resources that contains the specified keywords

// Priority categories for filter selection
// Strategy:
// - Always include: service.name, deployment.environment.name, deployment.environment, env, environment
// - Select ONE category only: stops at the first category with a matching attribute
// - Within category: picks the first available attribute by order
// - Order (highest to lowest priority): Kubernetes > Cloud > Host > Container
// - Fallback: If no priority match, uses regex-based filtering (excludes the above attributes)
const PRIORITY_CATEGORIES = [
	['k8s.pod.uid', 'k8s.pod.name', 'k8s.deployment.name'],
	['cloud.resource_id', 'cloud.provider', 'cloud.region'],
	['host.id', 'host.name'],
	['container.id', 'container.name'],
];

const SERVICE_AND_ENVIRONMENT_KEYS = [
	'service.name',
	'deployment.environment.name',
	'deployment.environment',
	'env',
	'environment',
];

export const getFiltersFromResources = (
	resources: ILog['resources_string'],
): TagFilterItem[] => {
	const keys = Object.keys(resources);

	return (
		keys
			// The filter keeps the name the log has, so it matches the log with
			// family resolution on or off. A log with both names of a family
			// keeps the current one: resolution reads that value, and a second
			// filter on the old value would exclude the log.
			.filter((key) => {
				const rename = getSemconvRename(key);
				return !(
					rename?.family.kind === 'attribute' && keys.includes(rename.current)
				);
			})
			.map((key: string) => {
				const resourceValue = resources[key] as string;
				return {
					id: uuid(),
					key: {
						key,
						dataType: DataTypes.String,
						type: 'resource',
					},
					op: OPERATORS['='],
					value: resourceValue,
				};
			})
	);
};

export const isServiceOrEnvironmentAttribute = (key: string): boolean =>
	SERVICE_AND_ENVIRONMENT_KEYS.includes(key);

export const getServiceAndEnvironmentFilterItems = (
	items: TagFilterItem[],
): TagFilterItem[] =>
	items.filter(
		(item) => item.key?.key && isServiceOrEnvironmentAttribute(item.key.key),
	);

export const findFirstPriorityItem = (
	items: TagFilterItem[],
): TagFilterItem | undefined =>
	PRIORITY_CATEGORIES.flat()
		.map((priorityKey) => items.find((item) => item.key?.key === priorityKey))
		.find(Boolean);

export const getFallbackItems = (items: TagFilterItem[]): TagFilterItem[] =>
	items.filter((item) => {
		if (!item.key?.key) {
			return false;
		}

		const { key } = item.key;

		return (
			FALLBACK_STARTS_WITH_REGEX.test(key) || FALLBACK_CONTAINS_REGEX.test(key)
		);
	});

export const updateFilters = (filters: TagFilter): TagFilter => {
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
		const fallbackItems = getFallbackItems(availableItems);
		if (fallbackItems.length > 0) {
			selectedItems.push(...fallbackItems);
		}
	}

	return {
		...filters,
		// deduplication
		items: Array.from(
			new Map(selectedItems.map((item) => [item.key?.key || '', item])).values(),
		),
	};
};
