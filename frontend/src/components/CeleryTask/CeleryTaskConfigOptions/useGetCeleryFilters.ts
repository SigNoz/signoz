/* eslint-disable react-hooks/exhaustive-deps */
import { DefaultOptionType } from 'antd/es/select';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

export interface Filters {
	searchText: string;
	attributeKey: string | string[];
	aggregateOperator?: string;
	dataSource?: DataSource;
	aggregateAttribute?: string;
	filterAttributeKeyDataType?: DataTypes;
	tagType?: string;
}

export interface GetAllFiltersResponse {
	options: DefaultOptionType[];
	isFetching: boolean;
}

export function useGetAllFilters(props: Filters): GetAllFiltersResponse {
	const {
		searchText,
		attributeKey,
		aggregateOperator,
		dataSource,
		aggregateAttribute,
		filterAttributeKeyDataType,
		tagType,
	} = props;

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isLoading } = useQuery(
		[
			REACT_QUERY_KEY.GET_ATTRIBUTE_VALUES,
			attributeKey,
			searchText,
			minTime,
			maxTime,
		],
		async () => {
			const keys = Array.isArray(attributeKey) ? attributeKey : [attributeKey];

			const responses = await Promise.all(
				keys.map((key) =>
					getAttributesValues({
						aggregateOperator: aggregateOperator || 'noop',
						dataSource: dataSource || DataSource.TRACES,
						aggregateAttribute: aggregateAttribute || '',
						attributeKey: key,
						searchText: searchText ?? '',
						filterAttributeKeyDataType:
							filterAttributeKeyDataType || DataTypes.String,
						tagType: tagType || 'tag',
					}),
				),
			);

			const uniqueValues = [
				...new Set(
					responses.flatMap(
						({ payload }) => Object.values(payload || {}).find((el) => !!el) || [],
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
