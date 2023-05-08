import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
// ** Constants
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { getFilterObjectValue } from 'lib/newQueryBuilder/getFilterObjectValue';
// ** Components
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { memo, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { ExtendedSelectOption } from 'types/common/select';

import { selectStyle } from '../QueryBuilderSearch/config';
import { GroupByFilterProps } from './GroupByFilter.interfaces';

export const GroupByFilter = memo(function GroupByFilter({
	query,
	onChange,
	disabled,
}: GroupByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText, isFocused],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText,
			}),
		{ enabled: !disabled && isFocused, keepPreviousData: true },
	);

	const handleSearchKeys = (searchText: string): void => {
		setSearchText(searchText);
	};

	const onBlur = (): void => {
		setIsFocused(false);
	};

	const onFocus = (): void => {
		setIsFocused(true);
	};

	const optionsData: ExtendedSelectOption[] = useMemo(() => {
		if (data && data.payload && data.payload.attributeKeys) {
			return data.payload.attributeKeys.map((item) => ({
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
			}));
		}

		return [];
	}, [data]);

	const handleChange = (values: ExtendedSelectOption[]): void => {
		const groupByValues: BaseAutocompleteData[] = values.map((item) => {
			const responseKeys = data?.payload?.attributeKeys || [];
			const { key, isColumn } = getFilterObjectValue(item.value);

			const existGroupResponse = responseKeys.find(
				(group) => group.key === key && group.isColumn === isColumn,
			);
			if (existGroupResponse) {
				return existGroupResponse;
			}

			const existGroupQuery = query.groupBy.find(
				(group) => group.key === key && group.isColumn === isColumn,
			);

			if (existGroupQuery) {
				return existGroupQuery;
			}

			return {
				isColumn: null,
				key,
				dataType: null,
				type: null,
			};
		});

		setSearchText('');
		onChange(groupByValues);
	};

	const values: ExtendedSelectOption[] = query.groupBy.map((item) => ({
		label: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
		key: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
		value: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
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
