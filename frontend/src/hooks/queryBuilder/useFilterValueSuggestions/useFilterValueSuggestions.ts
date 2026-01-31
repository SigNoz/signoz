import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useQuery } from 'react-query';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import type { CombinedFilterSuggestion, FilterValueSuggestion } from './types';
import { getSuggestions } from './utils';

export interface SuggestionsResponse {
	suggestions: FilterValueSuggestion[];
	combinedSuggestion: CombinedFilterSuggestion | null;
	isLoading: boolean;
}

export const useFilterValueSuggestions = (
	queryData: IBuilderQuery | undefined,
	enabled: boolean,
): {
	suggestions: FilterValueSuggestion[];
	combinedSuggestion: CombinedFilterSuggestion | null;
	isLoading: boolean;
} => {
	const hasFilters =
		queryData?.filters?.items?.length || queryData?.filter?.expression;

	const shouldFetch = enabled && !!hasFilters && !!queryData;

	const { data, isLoading } = useQuery<SuggestionsResponse>({
		queryKey: [QueryBuilderKeys.GET_FILTER_VALUE_SUGGESTIONS, queryData],
		queryFn: () => getSuggestions(queryData as IBuilderQuery),
		enabled: shouldFetch,
	});

	return {
		suggestions: data?.suggestions || [],
		combinedSuggestion: data?.combinedSuggestion || null,
		isLoading,
	};
};
