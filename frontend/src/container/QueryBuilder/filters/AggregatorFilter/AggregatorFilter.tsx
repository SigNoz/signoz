// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import { initialAggregateAttribute } from 'constants/queryBuilder';
import { getFilterObjectValue } from 'lib/newQueryBuilder/getFilterObjectValue';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';
import { ExtendedSelectOption } from 'types/common/select';
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

	const handleSearchAttribute = (searchText: string): void => {
		const { key } = getFilterObjectValue(searchText);
		setSearchText(key);
	};

	const optionsData: ExtendedSelectOption[] =
		data?.payload?.attributeKeys?.map((item) => ({
			label: transformStringWithPrefix({
				str: item.key,
				prefix: item.type || '',
				condition: !item.isColumn,
			}),
			value: transformStringWithPrefix({
				str: item.key,
				prefix: item.type || '',
				condition: !item.isColumn,
			}),
			key: transformStringWithPrefix({
				str: item.key,
				prefix: item.type || '',
				condition: !item.isColumn,
			}),
		})) || [];

	const handleChangeAttribute = (value: string): void => {
		const { key, isColumn } = getFilterObjectValue(value);
		const currentAttributeObj = data?.payload?.attributeKeys?.find(
			(item) => item.key === key && isColumn === item.isColumn,
		) || { ...initialAggregateAttribute, key };

		setSearchText('');
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

	const placeholder: string =
		query.dataSource === DataSource.METRICS
			? `${transformToUpperCase(query.dataSource)} name`
			: 'Aggregate attribute';

	return (
		<AutoComplete
			showSearch
			placeholder={placeholder}
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
