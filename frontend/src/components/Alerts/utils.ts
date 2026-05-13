import type { SortState } from 'components/TanStackTableView/types';

import type { AlertWithLabels, FilterValue } from './types';

/**
 * Generic sort function for alert-like data
 */
export function sortByColumn<T>(
	items: T[],
	orderBy: SortState | null,
	getSortValue: (item: T, columnName: string) => string | number,
	defaultSort?: SortState,
): T[] {
	const sortState = orderBy ?? defaultSort;
	if (!sortState) {
		return items;
	}

	const { columnName, order } = sortState;
	const multiplier = order === 'asc' ? 1 : -1;

	return [...items].sort((a, b) => {
		const aVal = getSortValue(a, columnName);
		const bVal = getSortValue(b, columnName);

		if (aVal < bVal) {
			return -1 * multiplier;
		}
		if (aVal > bVal) {
			return 1 * multiplier;
		}
		return 0;
	});
}

/**
 * Search alerts/rules by name, severity, and all labels
 */
export function searchByLabels<T extends AlertWithLabels>(
	items: T[],
	searchText: string,
	getAlertName: (item: T) => string,
): T[] {
	if (!searchText.trim()) {
		return items;
	}

	const value = searchText.toLowerCase().trim();

	return items.filter((item) => {
		const alertName = getAlertName(item).toLowerCase();
		const severity = item.labels?.severity?.toLowerCase() ?? '';

		const labelSearchString = Object.entries(item.labels ?? {})
			.map(([key, val]) => `${key} ${val}`)
			.join(' ')
			.toLowerCase();

		return (
			alertName.includes(value) ||
			severity.includes(value) ||
			labelSearchString.includes(value)
		);
	});
}

/**
 * Filter alerts by label key:value pairs
 * Same key uses OR logic, different keys use AND logic
 */
export function filterByLabels<T extends AlertWithLabels>(
	items: T[],
	selectedFilters: FilterValue[],
): T[] {
	if (!selectedFilters?.length) {
		return items;
	}

	const validFilters = selectedFilters
		.map((e) => e.value)
		.filter((v) => v.split(':').length === 2);

	if (!validFilters.length) {
		return [];
	}

	// Group values by key - same key uses OR, different keys use AND
	const filtersByKey = new Map<string, string[]>();
	validFilters.forEach((f) => {
		const [key, value] = f.split(':');
		const trimmedKey = key.trim().toLowerCase();
		const trimmedValue = value.trim().toLowerCase();
		const existing = filtersByKey.get(trimmedKey) ?? [];
		existing.push(trimmedValue);
		filtersByKey.set(trimmedKey, existing);
	});

	return items.filter((item) => {
		if (!item.labels) {
			return false;
		}

		// All keys must match (AND), any value per key can match (OR)
		return Array.from(filtersByKey.entries()).every(([filterKey, values]) => {
			// Case-insensitive key lookup
			const matchingKey = Object.keys(item.labels ?? {}).find(
				(k) => k.toLowerCase() === filterKey,
			);
			if (!matchingKey) {
				return false;
			}
			const labelValue = item.labels?.[matchingKey]?.toLowerCase();
			return values.some((v) => labelValue === v);
		});
	});
}
