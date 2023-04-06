// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { useMemo, useState } from 'react';
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
		[
			'GET_AGGREGATE_ATTRIBUTE',
			searchText,
			query.aggregateOperator,
			query.dataSource,
		],
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
			label: transformStringWithPrefix({
				str: item.key,
				prefix: item.type || '',
				condition: !item.isColumn,
			}),
			value: item.key,
		})) || [];

	const handleChangeAttribute = (value: string): void => {
		const currentAttributeObj = data?.payload?.attributeKeys?.find(
			(item) => item.key === value,
		) || { key: value, type: null, dataType: null, isColumn: null };

		onChange(currentAttributeObj);
	};

	const value = useMemo(
		() =>
			transformStringWithPrefix({
				str: query.aggregateAttribute.key,
				prefix: query.aggregateAttribute.type || '',
				condition: !query.aggregateAttribute.isColumn,
			}),
		[query],
	);

	return (
		<AutoComplete
			showSearch
			placeholder={`${transformToUpperCase(query.dataSource)} name`}
			style={{ width: '100%' }}
			showArrow={false}
			filterOption={false}
			onSearch={handleSearchAttribute}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={value}
			onChange={handleChangeAttribute}
		/>
	);
}
