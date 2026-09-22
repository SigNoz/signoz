import { useCallback, useState } from 'react';
import { useQuery } from 'react-query';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebounce from 'hooks/useDebounce';

interface UseDynamicVariableSearchProps {
	signal?: 'traces' | 'logs' | 'metrics';
	attribute?: string;
	startUnixMilli: number;
	endUnixMilli: number;
	existingQuery?: string;
	/** Only a truncated list needs the API — a complete one is filtered in the dropdown. */
	enabled: boolean;
}

export interface DynamicVariableSearch {
	/** Results while a server search is in effect, else null — render the base options. */
	results: { values: string[]; relatedValues: string[] } | null;
	isSearching: boolean;
	onSearch: (text: string) => void;
	reset: () => void;
}

/**
 * Server-side value search for a DYNAMIC variable, deliberately kept off the fetch
 * engine's own query: a keystroke must not settle the variable's fetch cycle and
 * re-cascade its dependent variables and panels.
 */
export function useDynamicVariableSearch({
	signal,
	attribute,
	startUnixMilli,
	endUnixMilli,
	existingQuery,
	enabled,
}: UseDynamicVariableSearchProps): DynamicVariableSearch {
	const [searchText, setSearchText] = useState('');
	const debouncedSearchText = useDebounce(searchText, DEBOUNCE_DELAY);
	const isActive =
		enabled && !!attribute && !!searchText && !!debouncedSearchText;

	const { data, isFetching } = useQuery(
		[
			'dashboard-variable-dynamic-search',
			signal,
			attribute,
			debouncedSearchText,
			existingQuery,
			startUnixMilli,
			endUnixMilli,
		],
		({ signal: abortSignal }) =>
			getFieldValues(
				signal,
				attribute,
				debouncedSearchText,
				startUnixMilli,
				endUnixMilli,
				existingQuery,
				abortSignal,
			),
		{ enabled: isActive, refetchOnWindowFocus: false, keepPreviousData: true },
	);

	const reset = useCallback((): void => setSearchText(''), []);

	// No results yet falls back to the base options rather than an empty dropdown:
	// the select filters them locally, so the list narrows while the API answers.
	const results = isActive ? data?.data : undefined;
	if (!results) {
		return {
			results: null,
			isSearching: isActive && isFetching,
			onSearch: setSearchText,
			reset,
		};
	}

	return {
		results: {
			values: results.normalizedValues ?? [],
			relatedValues: results.relatedValues ?? [],
		},
		isSearching: isFetching,
		onSearch: setSearchText,
		reset,
	};
}
