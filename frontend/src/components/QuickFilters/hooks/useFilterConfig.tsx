import getCustomFilters from 'api/quickFilters/getCustomFilters';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	Filter as FilterType,
	PayloadProps,
} from 'types/api/quickFilters/getCustomFilters';

import { IQuickFiltersConfig, SignalType } from '../types';
import { getFilterConfig } from '../utils';

interface UseFilterConfigProps {
	signal?: SignalType;
	config: IQuickFiltersConfig[];
}
interface UseFilterConfigReturn {
	filterConfig: IQuickFiltersConfig[];
	customFilters: FilterType[];
	setCustomFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
	isCustomFiltersLoading: boolean;
	isDynamicFilters: boolean;
	refetchCustomFilters: () => void;
}

const useFilterConfig = ({
	signal,
	config,
}: UseFilterConfigProps): UseFilterConfigReturn => {
	const [customFilters, setCustomFilters] = useState<FilterType[]>([]);
	const isDynamicFilters = useMemo(() => customFilters.length > 0, [
		customFilters,
	]);
	const { isFetching: isCustomFiltersLoading, refetch } = useQuery<
		SuccessResponse<PayloadProps> | ErrorResponse,
		Error
	>(
		[REACT_QUERY_KEY.GET_CUSTOM_FILTERS, signal],
		() => getCustomFilters({ signal: signal || '' }),
		{
			enabled: !!signal,
			refetchOnMount: 'always',
			keepPreviousData: true,
			onSuccess: (resp) => {
				if ('payload' in resp && resp.payload?.filters) {
					setCustomFilters(resp.payload.filters || ([] as FilterType[]));
				}
			},
		},
	);

	const filterConfig = useMemo(
		() => getFilterConfig(signal, customFilters, config),
		[config, customFilters, signal],
	);

	return {
		filterConfig,
		customFilters,
		setCustomFilters,
		isCustomFiltersLoading,
		isDynamicFilters,
		refetchCustomFilters: refetch,
	};
};

export default useFilterConfig;
