import { useMemo } from 'react';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import { SignalType } from 'components/QuickFilters/types';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { getFieldKeysSignal, mapFieldKeysToFilters } from '../utils';

const FIELD_KEYS_LIMIT = 100;

interface UseFieldKeysProps {
	signal: SignalType | undefined;
	searchText: string;
	enabled: boolean;
}

interface UseFieldKeysReturn {
	filters: FilterType[];
	isFetching: boolean;
}

/** Backs the logs and traces signals; meter keys still come from useGetQueryKeySuggestions. */
export function useFieldKeys({
	signal,
	searchText,
	enabled,
}: UseFieldKeysProps): UseFieldKeysReturn {
	const { data, isFetching } = useGetFieldsKeys(
		{
			signal: signal ? getFieldKeysSignal(signal) : undefined,
			searchText,
			limit: FIELD_KEYS_LIMIT,
		},
		{
			query: {
				enabled,
				cacheTime: FIELD_API_CACHE_TIME,
				keepPreviousData: true,
			},
		},
	);

	const filters = useMemo(() => mapFieldKeysToFilters(data?.data?.keys), [data]);
	return { filters, isFetching };
}
