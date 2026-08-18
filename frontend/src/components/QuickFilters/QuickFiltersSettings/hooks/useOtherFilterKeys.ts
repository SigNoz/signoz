import { useMemo } from 'react';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import { SignalType } from 'components/QuickFilters/types';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { getFieldKeysSignal, mapFieldKeysToFilters } from '../utils';

interface UseOtherFilterKeysProps {
	signal: SignalType | undefined;
	searchText: string;
	enabled: boolean;
}

interface UseOtherFilterKeysReturn {
	filters: FilterType[];
	isFetching: boolean;
}

export function useOtherFilterKeys({
	signal,
	searchText,
	enabled,
}: UseOtherFilterKeysProps): UseOtherFilterKeysReturn {
	const { data, isFetching } = useGetFieldsKeys(
		{
			signal: signal ? getFieldKeysSignal(signal) : undefined,
			searchText,
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
