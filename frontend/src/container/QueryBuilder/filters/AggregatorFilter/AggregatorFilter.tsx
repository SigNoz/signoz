// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import { initialAggregateAttribute } from 'constants/queryBuilder';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { SelectOption } from 'types/common/select';
import { transformToUpperCase } from 'utils/transformToUpperCase';

import { selectStyle } from '../QueryBuilderSearch/config';
// ** Types
import { AgregatorFilterProps } from './AggregatorFilter.intefaces';

export const AggregatorFilter = memo(function AggregatorFilter({
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
				searchText,
				aggregateOperator: query.aggregateOperator,
				dataSource: query.dataSource,
			}),
		{ enabled: !!query.aggregateOperator && !!query.dataSource },
	);

	const handleSearchAttribute = (searchText: string): void =>
		setSearchText(searchText);

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
		) || { ...initialAggregateAttribute, key: value };

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
			style={selectStyle}
			showArrow={false}
			filterOption={false}
			onSearch={handleSearchAttribute}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={value}
			onChange={handleChangeAttribute}
		/>
	);
});
