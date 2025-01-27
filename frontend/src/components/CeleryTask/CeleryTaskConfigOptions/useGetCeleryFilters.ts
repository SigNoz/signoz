/* eslint-disable react-hooks/exhaustive-deps */
import { DefaultOptionType } from 'antd/es/select';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { useQuery } from 'react-query';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export type FilterOptionType = 'celery.task_name';

export interface Filters {
	searchText: string;
	attributeKey: FilterOptionType;
}

export interface GetAllFiltersResponse {
	options: DefaultOptionType[];
	isFetching: boolean;
}

export function useGetAllFilters(props: Filters): GetAllFiltersResponse {
	const { searchText, attributeKey } = props;

	const { data, isLoading } = useQuery(
		['attributesValues', searchText],
		async () => {
			const { payload } = await getAttributesValues({
				aggregateOperator: 'noop',
				dataSource: DataSource.TRACES,
				aggregateAttribute: '',
				attributeKey,
				searchText: searchText ?? '',
				filterAttributeKeyDataType: DataTypes.String,
				tagType: 'tag',
			});

			if (payload) {
				const values = Object.values(payload).find((el) => !!el) || [];
				const options: DefaultOptionType[] = values.map((val: string) => ({
					label: val,
					value: val,
				}));
				return options;
			}
			return [];
		},
	);

	return { options: data ?? [], isFetching: isLoading };
}
