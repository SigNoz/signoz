import { useMemo } from 'react';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY } from 'constants/queryBuilder';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useGetQueryKeyValueSuggestions } from 'hooks/querySuggestions/useGetQueryKeyValueSuggestions';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

interface UseCheckboxFilterValuesProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	searchText: string;
	isOpen: boolean;
}

interface UseCheckboxFilterValuesReturn {
	attributeValues: string[];
	isLoading: boolean;
}

function useCheckboxFilterValues({
	filter,
	source,
	searchText,
	isOpen,
}: UseCheckboxFilterValuesProps): UseCheckboxFilterValuesReturn {
	const { data, isLoading } = useGetAggregateValues(
		{
			aggregateOperator: filter.aggregateOperator || 'noop',
			dataSource: filter.dataSource || DataSource.LOGS,
			aggregateAttribute: filter.aggregateAttribute || '',
			attributeKey: filter.attributeKey.key,
			filterAttributeKeyDataType: filter.attributeKey.dataType || DataTypes.EMPTY,
			tagType: filter.attributeKey.type || '',
			searchText: searchText ?? '',
		},
		{
			enabled: isOpen && source !== QuickFiltersSource.METER_EXPLORER,
			keepPreviousData: true,
		},
	);

	const { data: keyValueSuggestions, isLoading: isLoadingKeyValueSuggestions } =
		useGetQueryKeyValueSuggestions({
			key: filter.attributeKey.key,
			signal: filter.dataSource || DataSource.LOGS,
			signalSource: 'meter',
			options: {
				enabled: isOpen && source === QuickFiltersSource.METER_EXPLORER,
				keepPreviousData: true,
			},
		});

	const attributeValues: string[] = useMemo(() => {
		const dataType = filter.attributeKey.dataType || DataTypes.String;

		if (source === QuickFiltersSource.METER_EXPLORER && keyValueSuggestions) {
			// Process the response data
			const responseData = keyValueSuggestions?.data as any;
			const values = responseData.data?.values || {};
			const stringValues = values.stringValues || [];
			const numberValues = values.numberValues || [];

			// Generate options from string values - explicitly handle empty strings
			const stringOptions = stringValues
				// Strict filtering for empty string - we'll handle it as a special case if needed
				.filter(
					(value: string | null | undefined): value is string =>
						value !== null && value !== undefined && value !== '',
				);

			// Generate options from number values
			const numberOptions = numberValues
				.filter(
					(value: number | null | undefined): value is number =>
						value !== null && value !== undefined,
				)
				.map((value: number) => value.toString());

			// Combine all options and make sure we don't have duplicate labels
			return [...stringOptions, ...numberOptions];
		}

		const key = DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY[dataType];
		return (data?.payload?.[key] || []).filter(
			(val) => val !== undefined && val !== null,
		);
	}, [data?.payload, filter.attributeKey.dataType, keyValueSuggestions, source]);

	return {
		attributeValues,
		isLoading: isLoading || isLoadingKeyValueSuggestions,
	};
}

export default useCheckboxFilterValues;
