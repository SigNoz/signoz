import { useQuery } from 'react-query';
import type { DefaultOptionType } from 'antd/es/select';
import type { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { getFieldValueSuggestions } from 'api/querySuggestions/getFieldValueSuggestions';
import { FIELD_API_CACHE_TIME } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { toFieldValues } from 'hooks/querySuggestions/useFieldValuesSuggestion';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';
import { getValuesForDataType } from 'utils/fieldValues';

export interface Filters {
	searchText: string;
	attributeKey: string | string[];
	dataSource?: DataSource;
	metricName?: string;
	filterAttributeKeyDataType?: DataTypes;
	fieldContext?: TelemetrytypesFieldContextDTO;
}

export interface GetAllFiltersResponse {
	options: DefaultOptionType[];
	isFetching: boolean;
}

export function useGetAllFilters(props: Filters): GetAllFiltersResponse {
	const {
		searchText,
		attributeKey,
		dataSource,
		metricName,
		filterAttributeKeyDataType,
		fieldContext,
	} = props;

	const { data, isLoading } = useQuery(
		[
			REACT_QUERY_KEY.GET_ATTRIBUTE_VALUES,
			dataSource,
			metricName,
			attributeKey,
			fieldContext,
			searchText,
		],
		async () => {
			const keys = Array.isArray(attributeKey) ? attributeKey : [attributeKey];

			const responses = await Promise.all(
				keys.map((key) =>
					getFieldValueSuggestions({
						signal: DATA_SOURCE_TO_SIGNAL[dataSource || DataSource.TRACES],
						name: key,
						fieldContext,
						searchText: searchText ?? '',
						metricName,
					}),
				),
			);

			const uniqueValues = [
				...new Set(
					responses.flatMap((response) =>
						getValuesForDataType(toFieldValues(response), filterAttributeKeyDataType),
					),
				),
			];

			return uniqueValues.map((val: string) => ({
				label: val,
				value: val,
			}));
		},
		{ staleTime: FIELD_API_CACHE_TIME },
	);

	return { options: data ?? [], isFetching: isLoading };
}
