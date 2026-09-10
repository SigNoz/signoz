import { useMemo } from 'react';
import { useGetFieldsValues } from 'api/generated/services/fields';
import {
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { IQuickFiltersConfig } from 'components/QuickFilters/types';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';

interface UseFieldValuesProps {
	filter: IQuickFiltersConfig;
	searchText: string;
	existingQuery?: string;
	metricNamespace?: string;
	signal?: TelemetrytypesSignalDTO;
	source?: TelemetrytypesSourceDTO;
	startUnixMilli?: number;
	endUnixMilli?: number;
	enabled: boolean;
}

interface UseFieldValuesReturn {
	relatedValues: string[];
	allValues: string[];
	isLoading: boolean;
	isFetching: boolean;
}

export function useFieldValues({
	filter,
	searchText,
	existingQuery,
	metricNamespace,
	signal,
	source,
	startUnixMilli,
	endUnixMilli,
	enabled,
}: UseFieldValuesProps): UseFieldValuesReturn {
	const { data, isLoading, isFetching } = useGetFieldsValues(
		{
			signal,
			name: filter.attributeKey.key,
			searchText,
			existingQuery,
			metricNamespace,
			source,
			startUnixMilli,
			// This field does not affect the backend but I wanted to keep it here
			// in case we add the support in the future
			endUnixMilli,
		},
		{
			query: {
				enabled,
				cacheTime: FIELD_API_CACHE_TIME,
				keepPreviousData: true,
			},
		},
	);

	const relatedValues: string[] = useMemo(() => {
		const values = data?.data?.values;
		if (!values) {
			return [];
		}

		return (
			values.relatedValues?.filter(
				(value): value is string =>
					value !== null && value !== undefined && value !== '',
			) || []
		);
	}, [data]);

	const allValues: string[] = useMemo(() => {
		const values = data?.data?.values;
		if (!values) {
			return [];
		}

		const stringValues =
			values.stringValues?.filter(
				(value): value is string =>
					value !== null && value !== undefined && value !== '',
			) || [];
		const numberValues =
			values.numberValues
				?.filter((value): value is number => value !== null && value !== undefined)
				.map((value) => value.toString()) || [];
		const boolValues =
			values.boolValues
				?.filter((value): value is boolean => value !== null && value !== undefined)
				.map((value) => value.toString()) || [];

		return [...stringValues, ...numberValues, ...boolValues];
	}, [data]);

	return { relatedValues, allValues, isLoading, isFetching };
}
