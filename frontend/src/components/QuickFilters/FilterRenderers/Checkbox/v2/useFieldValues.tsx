import { useMemo } from 'react';
import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { FieldValuesConfig } from 'api/querySuggestions/types';
import { QUICK_FILTER_SOURCE_TO_SIGNAL } from 'components/QuickFilters/constants';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { useFieldValuesSuggestion } from 'hooks/querySuggestions/useFieldValuesSuggestion';
import { BuilderQueryType } from 'types/api/v5/queryRange';

interface UseFieldValuesProps {
	filter: IQuickFiltersConfig;
	searchText: string;
	existingQuery?: string;
	metricNamespace?: string;
	quickFilterSource: QuickFiltersSource;
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

const QUICK_FILTERS_SOURCE_TO_SOURCE: Partial<
	Record<QuickFiltersSource, TelemetrytypesSourceDTO>
> = {
	[QuickFiltersSource.METER_EXPLORER]: TelemetrytypesSourceDTO.meter,
};

export function useFieldValues({
	filter,
	searchText,
	existingQuery,
	metricNamespace,
	quickFilterSource,
	startUnixMilli,
	endUnixMilli,
	enabled,
}: UseFieldValuesProps): UseFieldValuesReturn {
	const isAIObservability =
		quickFilterSource === QuickFiltersSource.AI_OBSERVABILITY;

	const builderQueryType: BuilderQueryType | undefined = isAIObservability
		? 'builder_ai_query'
		: undefined;

	// The AI values endpoint is already gen_ai-scoped: no signal, no source.
	const fieldValuesConfig: FieldValuesConfig = isAIObservability
		? {
				name: filter.attributeKey.key,
				searchText,
				existingQuery,
				startUnixMilli,
				endUnixMilli,
			}
		: {
				signal: QUICK_FILTER_SOURCE_TO_SIGNAL[quickFilterSource],
				name: filter.attributeKey.key,
				searchText,
				existingQuery,
				metricNamespace,
				source: QUICK_FILTERS_SOURCE_TO_SOURCE[quickFilterSource],
				startUnixMilli,
				// This field does not affect the backend but I wanted to keep it here
				// in case we add the support in the future
				endUnixMilli,
			};

	const {
		data: values,
		isLoading,
		isFetching,
	} = useFieldValuesSuggestion(fieldValuesConfig, builderQueryType, { enabled });

	const relatedValues: string[] = useMemo(() => {
		if (!values) {
			return [];
		}

		return (
			values.relatedValues?.filter(
				(value): value is string =>
					value !== null && value !== undefined && value !== '',
			) || []
		);
	}, [values]);

	const allValues: string[] = useMemo(() => {
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
	}, [values]);

	return { relatedValues, allValues, isLoading, isFetching };
}
