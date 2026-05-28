import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';

import useDebounce from './useDebounce';

interface UseUrlSearchStateOptions {
	debounceMs?: number;
	onDebouncedChange?: (value: string) => void;
}

interface UseUrlSearchStateReturn {
	searchText: string;
	debouncedSearch: string;
	setSearchText: (value: string) => void;
	handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
	clearSearch: () => void;
}

/**
 * Hook for managing search state synced with URL query params.
 * Uses ref to track last synced value, preventing race conditions
 * when browser back/forward changes URL externally.
 */
export function useUrlSearchState(
	key: string,
	options: UseUrlSearchStateOptions = {},
): UseUrlSearchStateReturn {
	const { debounceMs = 300 } = options;

	const [searchParam, setSearchParam] = useQueryState(
		key,
		parseAsString.withDefault('').withOptions({ history: 'push' }),
	);

	const [searchText, setSearchText] = useState(searchParam);
	const debouncedSearch = useDebounce(searchText, debounceMs);

	// Track what we last synced to URL to detect external changes
	const lastSyncedToUrl = useRef(searchParam);
	const onDebouncedChange = options.onDebouncedChange;

	// Sync debounced value to URL (user typing -> URL)
	useEffect(() => {
		if (debouncedSearch !== lastSyncedToUrl.current) {
			lastSyncedToUrl.current = debouncedSearch;
			void setSearchParam(debouncedSearch || null);
			onDebouncedChange?.(debouncedSearch);
		}
	}, [debouncedSearch, setSearchParam, onDebouncedChange]);

	// Sync URL to local state (browser back/forward -> input)
	useEffect(() => {
		if (searchParam !== lastSyncedToUrl.current) {
			lastSyncedToUrl.current = searchParam;
			setSearchText(searchParam);
		}
	}, [searchParam]);

	const handleSearchChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>): void => {
			setSearchText(e.target.value);
		},
		[],
	);

	const clearSearch = useCallback((): void => {
		setSearchText('');
		onDebouncedChange?.('');
	}, [onDebouncedChange]);

	return {
		searchText,
		debouncedSearch,
		setSearchText,
		handleSearchChange,
		clearSearch,
	};
}
