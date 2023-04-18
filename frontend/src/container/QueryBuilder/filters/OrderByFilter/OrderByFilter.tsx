import { Select, Spin } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { IOption } from 'hooks/useResourceAttribute/types';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregateOperator } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';
import {
	OrderByFilterProps,
	OrderByFilterValue,
} from './OrderByFilter.interfaces';
import { getLabelFromValue, mapLabelValuePairs } from './utils';

export function OrderByFilter({
	query,
	onChange,
}: OrderByFilterProps): JSX.Element {
	const [searchText, setSearchText] = useState<string>('');
	const [selectedValue, setSelectedValue] = useState<OrderByFilterValue[]>([]);

	const { data, isFetching } = useQuery(
		[QueryBuilderKeys.GET_AGGREGATE_KEYS, searchText],
		async () =>
			getAggregateKeys({
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				searchText,
			}),
		{ enabled: !!query.aggregateAttribute.key, keepPreviousData: true },
	);

	const handleSearchKeys = useCallback(
		(searchText: string): void => setSearchText(searchText),
		[],
	);

	const generateOptionsData = (
		attributeKeys: BaseAutocompleteData[] | undefined,
		selectedValue: OrderByFilterValue[],
		query: IBuilderQueryForm,
	): IOption[] => {
		const selectedValueLabels = getLabelFromValue(selectedValue);

		const noAggregationOptions = attributeKeys
			? mapLabelValuePairs(attributeKeys)
					.flat()
					.filter(
						(option) => !selectedValueLabels.includes(option.label.split(' ')[0]),
					)
			: [];

		const aggregationOptions = mapLabelValuePairs(query.groupBy)
			.flat()
			.concat([
				{
					label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) asc`,
					value: `${query.aggregateOperator}(${query.aggregateAttribute.key}) asc`,
				},
				{
					label: `${query.aggregateOperator}(${query.aggregateAttribute.key}) desc`,
					value: `${query.aggregateOperator}(${query.aggregateAttribute.key}) desc`,
				},
			])
			.filter(
				(option) => !selectedValueLabels.includes(option.label.split(' ')[0]),
			);

		return query.aggregateOperator === MetricAggregateOperator.NOOP
			? noAggregationOptions
			: aggregationOptions;
	};

	const optionsData = useMemo(
		() => generateOptionsData(data?.payload?.attributeKeys, selectedValue, query),
		[data?.payload?.attributeKeys, query, selectedValue],
	);

	const handleChange = (values: OrderByFilterValue[]): void => {
		setSelectedValue(values);
		const orderByValues: BaseAutocompleteData[] = values?.map((item) => {
			const iterationArray = data?.payload?.attributeKeys || query.orderBy;
			const existingOrderValues = iterationArray.find(
				(group) => group.key === item.value,
			);
			if (existingOrderValues) {
				return existingOrderValues;
			}

			return {
				isColumn: null,
				key: item.value,
				dataType: null,
				type: null,
			};
		});
		onChange(orderByValues);
	};

	const values: OrderByFilterValue[] = query.orderBy.map((item) => ({
		label: transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		}),
		key: item.key,
		value: item.key,
		disabled: undefined,
		title: undefined,
	}));

	const isDisabledSelect = useMemo(
		() =>
			!query.aggregateAttribute.key ||
			query.aggregateOperator === MetricAggregateOperator.NOOP,
		[query.aggregateAttribute.key, query.aggregateOperator],
	);

	return (
		<Select
			mode="tags"
			style={selectStyle}
			onSearch={handleSearchKeys}
			showSearch
			disabled={isDisabledSelect}
			showArrow={false}
			filterOption={false}
			options={optionsData}
			labelInValue
			value={values}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
			onChange={handleChange}
		/>
	);
}
