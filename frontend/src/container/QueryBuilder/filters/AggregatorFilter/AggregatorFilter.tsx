// ** Components
import { AutoComplete, Spin } from 'antd';
// ** Api
import { getAggregateAttribute } from 'api/queryBuilder/getAggregateAttribute';
import {
	initialAggregateAttribute,
	QueryBuilderKeys,
	selectValueDivider,
} from 'constants/queryBuilder';
import useDebounce from 'hooks/useDebounce';
import { getFilterObjectValue } from 'lib/newQueryBuilder/getFilterObjectValue';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';
import { ExtendedSelectOption } from 'types/common/select';
import { transformToUpperCase } from 'utils/transformToUpperCase';
import { v4 as uuid } from 'uuid';

import { selectStyle } from '../QueryBuilderSearch/config';
// ** Types
import { AgregatorFilterProps } from './AggregatorFilter.intefaces';

export const AggregatorFilter = memo(function AggregatorFilter({
	onChange,
	query,
}: AgregatorFilterProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<ExtendedSelectOption[]>([]);
	const debouncedValue = useDebounce(query.aggregateAttribute.key, 300);
	const { data, isFetching } = useQuery(
		[
			QueryBuilderKeys.GET_AGGREGATE_ATTRIBUTE,
			debouncedValue,
			query.aggregateOperator,
			query.dataSource,
		],
		async () =>
			getAggregateAttribute({
				searchText: debouncedValue,
				aggregateOperator: query.aggregateOperator,
				dataSource: query.dataSource,
			}),
		{
			enabled: !!query.aggregateOperator && !!query.dataSource,
			onSuccess: (data) => {
				const options: ExtendedSelectOption[] =
					data?.payload?.attributeKeys?.map((item) => ({
						label: transformStringWithPrefix({
							str: item.key,
							prefix: item.type || '',
							condition: !item.isColumn,
						}),
						value: `${transformStringWithPrefix({
							str: item.key,
							prefix: item.type || '',
							condition: !item.isColumn,
						})}${selectValueDivider}${item.id || uuid()}`,
						key: item.id || uuid(),
					})) || [];

				setOptionsData(options);
			},
		},
	);

	const handleChangeAttribute = useCallback(
		(
			value: string,
			option: ExtendedSelectOption | ExtendedSelectOption[],
		): void => {
			const currentOption = option as ExtendedSelectOption;

			const { key } = getFilterObjectValue(value);

			const currentAttributeObj = data?.payload?.attributeKeys?.find(
				(item) => currentOption.key === item.id,
			) || { ...initialAggregateAttribute, key };

			onChange(currentAttributeObj);
		},
		[data, onChange],
	);

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
			placeholder={placeholder}
			style={selectStyle}
			showArrow={false}
			filterOption={false}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			options={optionsData}
			value={value}
			onChange={handleChangeAttribute}
		/>
	);
});
