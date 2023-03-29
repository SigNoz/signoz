// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { SelectOption } from 'types/common/select';
import { transformToUpperCase } from 'utils/transformToUpperCase';

// ** Types
import { AgregatorFilterProps } from './AggregatorFilter.intefaces';

export function AggregatorFilter({
	onChange,
	query,
}: AgregatorFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');

	const { data, isFetching } = useQuery(
		['GET_AGGREGATE_ATTRIBUTE', searchText],
		async () =>
			getAggregateAttribute({
				aggregateOperator: query.aggregateOperator,
				dataSource: query.dataSource,
				searchText,
			}),
		{ enabled: !!query.aggregateOperator && !!query.dataSource },
	);

	const handleSearchAttribute = (searchText: string): void => {
		setSearchText(searchText);
	};

	const optionsData: SelectOption<string, string>[] =
		data?.payload?.attributeKeys?.map((item) => ({
			label: item.label,
			value: item.key,
		})) || [];

	const handleChangeAttribute = (value: string): void => {
		const currentAttributeObj = data?.payload?.attributeKeys?.find(
			(item) => item.key === value,
		) || { label: value, key: value, type: null, dataType: null, isColumn: null };

		onChange(currentAttributeObj);
	};

	return (
		<AutoComplete
			showSearch
			placeholder={`${transformToUpperCase(
				query.dataSource,
			)} Name (Start typing to get suggestions)`}
			style={{ flex: 1, minWidth: 200 }}
			showArrow={false}
			filterOption={false}
			onSearch={handleSearchAttribute}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={query.aggregateAttribute.label}
			onChange={handleChangeAttribute}
		/>
	);
}
