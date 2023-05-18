import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { QueryBuilderKeys, selectValueDivider } from 'constants/queryBuilder';
import useDebounce from 'hooks/useDebounce';
import { getFilterObjectValue } from 'lib/newQueryBuilder/getFilterObjectValue';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { ExtendedSelectOption } from 'types/common/select';
import { v4 as uuid } from 'uuid';

import { selectStyle } from '../QueryBuilderSearch/config';
import { GroupByFilterProps } from './GroupByFilter.interfaces';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
}: GroupByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [optionsData, setOptionsData] = useState<ExtendedSelectOption[]>([]);
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const debouncedValue = useDebounce(searchText, 300);

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, debouncedValue, isFocused],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText: debouncedValue,
			}),
		{
			enabled: !disabled && isFocused,
			onSuccess: (data) => {
				const keys = query.groupBy.reduce<string[]>((acc, item) => {
					acc.push(item.key);
					return acc;
				}, []);

				const filteredOptions: BaseAutocompleteData[] =
					data?.payload?.attributeKeys?.filter(
						(attrKey) => !keys.includes(attrKey.key),
					) || [];

				const options: ExtendedSelectOption[] =
					filteredOptions.map((item) => ({
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
						title: item.key,
					})) || [];

				setOptionsData(options);
			},
		},
	);

	const handleSearchKeys = (searchText: string): void => {
		setSearchText(searchText);
	};

	const onBlur = (): void => {
		setIsFocused(false);
		setSearchText('');
	};

	const onFocus = (): void => {
		setIsFocused(true);
	};

	const handleChange = (values: ExtendedSelectOption[]): void => {
		const groupByValues: BaseAutocompleteData[] = values.map((item) => {
			const responseKeys = data?.payload?.attributeKeys || [];
			const { key } = getFilterObjectValue(item.value);

			const existGroupResponse = responseKeys.find(
				(group) => group.id === item.key,
			);

			if (existGroupResponse) {
				return existGroupResponse;
			}

			const existGroupQuery = query.groupBy.find((group) => group.id === item.key);

			if (existGroupQuery) {
				return existGroupQuery;
			}

			return {
				id: uuid(),
				isColumn: null,
				key,
				dataType: null,
				type: null,
			};
		});

		onChange(groupByValues);
	};

	const values: ExtendedSelectOption[] = query.groupBy.map((item) => ({
		label: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
		key: item.id || uuid(),
		value: `${transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		})}${selectValueDivider}${item.id || uuid()}`,
	}));

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={disabled}
			showArrow={false}
			onBlur={onBlur}
			onFocus={onFocus}
			options={optionsData}
			filterOption={false}
			labelInValue
			value={values}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
});
