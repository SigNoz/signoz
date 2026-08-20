import { useMemo } from 'react';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import { SignalType } from 'components/QuickFilters/types';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { SIGNAL_DATA_SOURCE_MAP } from '../constants';
import {
	DATA_SOURCE_TO_SIGNAL,
	mapFieldKeysToFilters,
	mapMeterFieldKeysToFilters,
} from '../utils';

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

/** Meter keys are a source-scoped subset of metrics, hence the `source` param and its own mapper. */
export function useFieldKeys({
	signal,
	searchText,
	enabled,
}: UseFieldKeysProps): UseFieldKeysReturn {
	const isMeterSignal = signal === SignalType.METER_EXPLORER;

	const { data, isFetching } = useGetFieldsKeys(
		{
			signal: signal
				? DATA_SOURCE_TO_SIGNAL[SIGNAL_DATA_SOURCE_MAP[signal]]
				: undefined,
			source: isMeterSignal ? TelemetrytypesSourceDTO.meter : undefined,
			searchText,
			limit: FIELD_KEYS_LIMIT,
		},
		{
			query: {
				enabled,
				keepPreviousData: true,
			},
		},
	);

	const filters = useMemo(
		() =>
			isMeterSignal
				? mapMeterFieldKeysToFilters(data?.data?.keys)
				: mapFieldKeysToFilters(data?.data?.keys),
		[data, isMeterSignal],
	);
	return { filters, isFetching };
}
