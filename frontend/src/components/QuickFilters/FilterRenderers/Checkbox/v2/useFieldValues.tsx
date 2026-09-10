import { useMemo } from 'react';
import { useGetAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { useGetFieldsValues } from 'api/generated/services/fields';
import {
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { DataSource } from 'types/common/queryBuilder';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';

interface UseFieldValuesProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	searchText: string;
	existingQuery?: string;
	metricNamespace?: string;
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

export const DATA_SOURCE_TO_SIGNAL: Record<
	DataSource,
	TelemetrytypesSignalDTO
> = {
	[DataSource.METRICS]: TelemetrytypesSignalDTO.metrics,
	[DataSource.TRACES]: TelemetrytypesSignalDTO.traces,
	[DataSource.LOGS]: TelemetrytypesSignalDTO.logs,
};

const QUICK_FILTERS_SOURCE_TO_SOURCE: Partial<
	Record<QuickFiltersSource, TelemetrytypesSourceDTO>
> = {
	[QuickFiltersSource.METER_EXPLORER]: TelemetrytypesSourceDTO.meter,
};

export function useFieldValues({
	filter,
	source,
	searchText,
	existingQuery,
	metricNamespace,
	startUnixMilli,
	endUnixMilli,
	enabled,
}: UseFieldValuesProps): UseFieldValuesReturn {
	const isAIObservability = source === QuickFiltersSource.AI_OBSERVABILITY;

	const fieldsValues = useGetFieldsValues(
		{
			signal: filter.dataSource
				? DATA_SOURCE_TO_SIGNAL[filter.dataSource]
				: undefined,
			name: filter.attributeKey.key,
			searchText,
			existingQuery,
			metricNamespace,
			source: source ? QUICK_FILTERS_SOURCE_TO_SOURCE[source] : undefined,
			startUnixMilli,
			// This field does not affect the backend but I wanted to keep it here
			// in case we add the support in the future
			endUnixMilli,
		},
		{
			query: {
				enabled: enabled && !isAIObservability,
				cacheTime: FIELD_API_CACHE_TIME,
				keepPreviousData: true,
			},
		},
	);

	const aiObservabilityValues = useGetAIObservabilityFieldsValues(
		{
			name: filter.attributeKey.key,
			searchText,
			existingQuery,
			startUnixMilli,
			endUnixMilli,
		},
		{
			query: {
				enabled: enabled && isAIObservability,
				cacheTime: FIELD_API_CACHE_TIME,
				keepPreviousData: true,
			},
		},
	);

	const { data, isLoading, isFetching } = isAIObservability
		? aiObservabilityValues
		: fieldsValues;

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
