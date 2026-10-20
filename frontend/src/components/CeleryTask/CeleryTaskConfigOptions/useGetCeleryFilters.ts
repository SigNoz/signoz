import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import type { DefaultOptionType } from 'antd/es/select';
import { getFieldValueSuggestions } from 'api/querySuggestions/getFieldValueSuggestions';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { toFieldValues } from 'hooks/querySuggestions/useFieldValuesSuggestion';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getValuesForDataType } from 'utils/fieldValues';

export interface Filters {
	searchText: string;
	attributeKey: string | string[];
	dataSource?: DataSource;
	metricName?: string;
	filterAttributeKeyDataType?: DataTypes;
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
	} = props;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isLoading } = useQuery(
		[
			REACT_QUERY_KEY.GET_ATTRIBUTE_VALUES,
			dataSource,
			metricName,
			attributeKey,
			searchText,
			minTime,
			maxTime,
		],
		async () => {
			const keys = Array.isArray(attributeKey) ? attributeKey : [attributeKey];

			const responses = await Promise.all(
				keys.map((key) =>
					getFieldValueSuggestions({
						signal: DATA_SOURCE_TO_SIGNAL[dataSource || DataSource.TRACES],
						name: key,
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
	);

	return { options: data ?? [], isFetching: isLoading };
}
