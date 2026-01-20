import getCustomFilters from 'api/quickFilters/getCustomFilters';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { IQuickFiltersConfig, SignalType } from '../types';
import { getFilterConfig } from '../utils';

interface UseFilterConfigProps {
	signal?: SignalType;
	config: IQuickFiltersConfig[];
}
interface UseFilterConfigReturn {
	filterConfig: IQuickFiltersConfig[];
	customFilters: FilterType[];
	isCustomFiltersLoading: boolean;
	isDynamicFilters: boolean;
	refetchCustomFilters: () => void;
}

const useFilterConfig = ({
	signal,
	config,
}: UseFilterConfigProps): UseFilterConfigReturn => {
	const {
		isFetching: isCustomFiltersLoading,
		data: customFilters = [],
		refetch,
	} = useQuery<FilterType[], Error>(
		[REACT_QUERY_KEY.GET_CUSTOM_FILTERS, signal],
		async () => {
			const res = await getCustomFilters({ signal: signal || '' });
			return 'payload' in res && res.payload?.filters ? res.payload.filters : [];
		},
		{
			enabled: !!signal,
		},
	);

	const isDynamicFilters = useMemo(() => customFilters.length > 0, [
		customFilters,
	]);

	const filterConfig = useMemo(
		() => getFilterConfig(signal, customFilters, config),
		[config, customFilters, signal],
	);

	return {
		filterConfig,
		customFilters,
		isCustomFiltersLoading,
		isDynamicFilters,
		refetchCustomFilters: refetch,
	};
};

export default useFilterConfig;
