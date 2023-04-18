import { Select } from 'antd';
// ** Constants
import {
	initialHavingValues,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
} from 'constants/queryBuilder';
import {
	transformFromStringToHaving,
	transformHavingToStringValue,
} from 'lib/query/transformQueryBuilderData';
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Having } from 'types/api/queryBuilder/queryBuilderData';
import { SelectOption } from 'types/common/select';

// ** Types
import { HavingFilterProps } from './HavingFilter.interfaces';

const { Option } = Select;

export function HavingFilter({
	query,
	onChange,
}: HavingFilterProps): JSX.Element {
	const { having } = query;
	const [searchText, setSearchText] = useState<string>('');
	const [options, setOptions] = useState<SelectOption<string, string>[]>([]);
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [currentFormValue, setCurrentFormValue] = useState<Having>(
		initialHavingValues,
	);

	const numberOperators = QUERY_BUILDER_OPERATORS_BY_TYPES.number;

	const aggregatorAttribute = useMemo(
		() =>
			transformStringWithPrefix({
				str: query.aggregateAttribute.key,
				prefix: query.aggregateAttribute.type || '',
				condition: !query.aggregateAttribute.isColumn,
			}),
		[query],
	);

	const columnName = useMemo(
		() => `${query.aggregateOperator.toUpperCase()}(${aggregatorAttribute})`,
		[query, aggregatorAttribute],
	);

	const aggregatorOptions: SelectOption<string, string>[] = useMemo(
		() => [{ label: columnName, value: columnName }],
		[columnName],
	);

	const generateOptions = useCallback(
		(search: string): void => {
			const [aggregator = '', op = '', value = ''] = search.split(' ');
			let newOptions: SelectOption<string, string>[] = [];

			const isAggregatorExist = columnName
				.toLowerCase()
				.includes(search.toLowerCase());

			const isAggregatorChosen = aggregator === columnName;

			if (isAggregatorExist || aggregator === '') {
				newOptions = aggregatorOptions;
			}

			if ((isAggregatorChosen && op === '') || op) {
				const filteredOperators = numberOperators.filter((num) =>
					num.toLowerCase().includes(op.toLowerCase()),
				);

				newOptions = filteredOperators.map((opt) => ({
					label: `${columnName} ${opt} ${value}`,
					value: `${columnName} ${opt} ${value}`,
				}));
			}

			setOptions(newOptions);
		},
		[columnName, numberOperators, aggregatorOptions],
	);

	const isValidHavingValue = (search: string): boolean => {
		const arr = search.split(' ');
		if (arr.length === 3 && arr.at(-1)) {
			const havingValue = arr[2];

			const numRegexp = /^-?\d*\.?\d*$/;

			return numRegexp.test(havingValue);
		}

		return true;
	};

	const handleSearch = (search: string): void => {
		const currentSearch = search.split(' ').slice(0, 3).join(' ');
		const isValidSearch = isValidHavingValue(search);

		if (isValidSearch) {
			setSearchText(currentSearch.trimStart());
		}
	};

	const resetChanges = (): void => {
		handleSearch('');
		setCurrentFormValue(initialHavingValues);
		setOptions(aggregatorOptions);
	};

	const handleChange = (values: string[]): void => {
		const having: Having[] = values.map(transformFromStringToHaving);

		const isSelectable: boolean = Object.values(currentFormValue).every(
			(value) => !!value,
		);

		if (isSelectable) {
			onChange(having);
			resetChanges();
		}
	};

	const handleSelect = (currentValue: string): void => {
		const arr = currentValue.split(' ');
		const isCompleted = arr.every((item) => !!item);

		const isClearSearch = isCompleted && arr.length === 3;

		handleSearch(isClearSearch ? '' : currentValue);
	};

	const parseSearchText = useCallback(
		(text: string) => {
			const [columnName = '', op = '', value = ''] = text.split(' ');
			setCurrentFormValue({ columnName, op, value });

			generateOptions(text);
		},
		[generateOptions],
	);

	const handleDeselect = (value: string): void => {
		const result = localValues.filter((item) => item !== value);
		setLocalValues(result);
	};

	useEffect(() => {
		parseSearchText(searchText);
	}, [searchText, parseSearchText]);

	useEffect(() => {
		setLocalValues(transformHavingToStringValue(having));
	}, [having]);

	return (
		<Select
			mode="multiple"
			onSearch={handleSearch}
			searchValue={searchText}
			value={localValues}
			data-testid="havingSelect"
			disabled={!query.aggregateAttribute.key}
			style={{ width: '100%' }}
			notFoundContent={!currentFormValue.value ? undefined : null}
			placeholder="Count(operation) > 5"
			onDeselect={handleDeselect}
			onBlur={resetChanges}
			onChange={handleChange}
			onSelect={handleSelect}
		>
			{options.map((opt) => (
				<Option key={opt.value} value={opt.value} title="havingOption">
					{opt.label}
				</Option>
			))}
		</Select>
	);
}
