import { useMemo } from 'react';
import { useGetQuickFilters } from 'api/generated/services/quick-filter';
import { QuickfiltertypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { IQuickFiltersConfig } from '../types';
import { getFilterConfig } from '../utils';

interface UseFilterConfigProps {
	savedFiltersSource?: QuickfiltertypesSourceDTO;
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
	savedFiltersSource,
	config,
}: UseFilterConfigProps): UseFilterConfigReturn => {
	const {
		isFetching: isCustomFiltersLoading,
		data,
		refetch,
	} = useGetQuickFilters(
		{ source: savedFiltersSource ?? '' },
		{ query: { enabled: !!savedFiltersSource } },
	);

	const customFilters = useMemo<TelemetryFieldKey[]>(
		() => (data?.data?.filters ?? []) as TelemetryFieldKey[],
		[data],
	);

	const isDynamicFilters = !!savedFiltersSource;

	const filterConfig = useMemo(
		() => getFilterConfig(customFilters, config),
		[config, customFilters],
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
