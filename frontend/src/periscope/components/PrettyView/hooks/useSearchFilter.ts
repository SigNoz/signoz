import { useMemo, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = any;

function isLeaf(value: unknown): boolean {
	return value === null || value === undefined || typeof value !== 'object';
}

function matchesQuery(text: string, lowerQuery: string): boolean {
	return text.toLowerCase().includes(lowerQuery);
}

// Filter a single value (leaf, array, or object) against the query.
// Returns the filtered value or null if no match.
function filterValue(value: AnyValue, query: string): AnyValue | null {
	if (isLeaf(value)) {
		return matchesQuery(String(value), query.toLowerCase()) ? value : null;
	}

	if (Array.isArray(value)) {
		return filterArray(value, query);
	}

	return filterTree(value, query);
}

// Recursively filter an array, keeping only elements that match
function filterArray(arr: AnyValue[], query: string): AnyValue[] | null {
	const results = arr
		.map((item) => filterValue(item, query))
		.filter((item) => item !== null);

	return results.length > 0 ? results : null;
}

// Recursively filter the data tree, keeping only branches with matching keys or values
export function filterTree(obj: AnyRecord, query: string): AnyRecord | null {
	const result: AnyRecord = {};
	const lowerQuery = query.toLowerCase();
	let hasMatch = false;

	for (const [key, value] of Object.entries(obj)) {
		if (matchesQuery(key, lowerQuery)) {
			result[key] = value;
			hasMatch = true;
			continue;
		}

		const filtered = filterValue(value, query);
		if (filtered !== null) {
			result[key] = filtered;
			hasMatch = true;
		}
	}

	return hasMatch ? result : null;
}

interface UseSearchFilterReturn {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	filteredData: AnyRecord;
}

function useSearchFilter(data: AnyRecord): UseSearchFilterReturn {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredData = useMemo(() => {
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			return data;
		}
		return filterTree(data, trimmed) || {};
	}, [data, searchQuery]);

	return { searchQuery, setSearchQuery, filteredData };
}

export default useSearchFilter;
