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
	setIsStale: React.Dispatch<React.SetStateAction<boolean>>;
}

const useFilterConfig = ({
	signal,
	config,
}: UseFilterConfigProps): UseFilterConfigReturn => {
	const [customFilters, setCustomFilters] = useState<FilterType[]>([]);
	const [isStale, setIsStale] = useState(true);
	const isDynamicFilters = useMemo(() => customFilters.length > 0, [
		customFilters,
	]);
	const { isFetching: isCustomFiltersLoading } = useQuery<
		SuccessResponse<PayloadProps> | ErrorResponse,
		Error
	>(
		[REACT_QUERY_KEY.GET_CUSTOM_FILTERS, signal],
		() => getCustomFilters({ signal: signal || '' }),
		{
			onSuccess: (data) => {
				if ('payload' in data && data.payload?.filters) {
					setCustomFilters(data.payload.filters || ([] as FilterType[]));
				}
				setIsStale(false);
			},
			enabled: !!signal && isStale,
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
		setIsStale,
	};
};

export default useFilterConfig;
