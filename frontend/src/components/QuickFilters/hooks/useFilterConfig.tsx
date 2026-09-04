import { useMemo } from 'react';
import { useGetQuickFilters } from 'api/generated/services/quick-filter';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { IQuickFiltersConfig, SignalType } from '../types';
import { getFilterConfig } from '../utils';

interface UseFilterConfigProps {
	signal?: SignalType;
	config: IQuickFiltersConfig[];
}
interface UseFilterConfigReturn {
	filterConfig: IQuickFiltersConfig[];
	customFilters: TelemetryFieldKey[];
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
		data,
		refetch,
	} = useGetQuickFilters(
		{ signalName: signal ?? '' },
		{ query: { enabled: !!signal } },
	);

	const customFilters = useMemo<TelemetryFieldKey[]>(
		() => (data?.data?.filters ?? []) as TelemetryFieldKey[],
		[data],
	);

	const isDynamicFilters = useMemo(
		() => customFilters.length > 0,
		[customFilters],
	);

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
