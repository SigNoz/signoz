import { Select } from 'antd';
// ** Constants
import { HAVING_OPERATORS, initialHavingValues } from 'constants/queryBuilder';
// ** Hooks
import { useTagValidation } from 'hooks/queryBuilder/useTagValidation';
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

	const { isMulti } = useTagValidation(
		searchText,
		currentFormValue.op,
		currentFormValue.value,
	);

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

	const getHavingObject = useCallback((currentSearch: string): Having => {
		const textArr = currentSearch.split(' ');
		const [columnName = '', op = '', ...value] = textArr;

		return { columnName, op, value };
	}, []);

	const generateOptions = useCallback(
		(search: string): void => {
			const [aggregator = '', op = '', ...restValue] = search.split(' ');
			let newOptions: SelectOption<string, string>[] = [];

			const isAggregatorExist = columnName
				.toLowerCase()
				.includes(search.toLowerCase());

			const isAggregatorChosen = aggregator === columnName;

			if (isAggregatorExist || aggregator === '') {
				newOptions = aggregatorOptions;
			}

			if ((isAggregatorChosen && op === '') || op) {
				const filteredOperators = HAVING_OPERATORS.filter((num) =>
					num.toLowerCase().includes(op.toLowerCase()),
				);

				newOptions = filteredOperators.map((opt) => ({
					label: `${columnName} ${opt} ${restValue && restValue.join(' ')}`,
					value: `${columnName} ${opt} ${restValue && restValue.join(' ')}`,
				}));
			}

			setOptions(newOptions);
		},
		[columnName, aggregatorOptions],
	);

	const isValidHavingValue = (search: string): boolean => {
		const values = getHavingObject(search).value.join(' ');
		if (values) {
			const numRegexp = /^[^a-zA-Z]*$/;

			return numRegexp.test(values);
		}

		return true;
	};

	const handleSearch = (search: string): void => {
		const trimmedSearch = search.replace(/\s\s+/g, ' ').trimStart();

		const currentSearch = isMulti
			? trimmedSearch
			: trimmedSearch.split(' ').slice(0, 3).join(' ');
		const isValidSearch = isValidHavingValue(currentSearch);

		if (isValidSearch) {
			setSearchText(currentSearch);
		}
	};

	const resetChanges = (): void => {
		handleSearch('');
		setCurrentFormValue(initialHavingValues);
		setOptions(aggregatorOptions);
	};

	const handleChange = (values: string[]): void => {
		const having: Having[] = values.map(transformFromStringToHaving);

		const isSelectable: boolean =
			currentFormValue.value.length > 0 &&
			currentFormValue.value.every((value) => !!value);

		if (isSelectable) {
			onChange(having);
			resetChanges();
		}
	};

	const handleSelect = (currentValue: string): void => {
		const { columnName, op, value } = getHavingObject(currentValue);

		const isCompletedValue = value.every((item) => !!item);

		const isClearSearch = isCompletedValue && columnName && op;

		handleSearch(isClearSearch ? '' : currentValue);
	};

	const parseSearchText = useCallback(
		(text: string) => {
			const { columnName, op, value } = getHavingObject(text);
			setCurrentFormValue({ columnName, op, value });

			generateOptions(text);
		},
		[generateOptions, getHavingObject],
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
			notFoundContent={currentFormValue.value.length === 0 ? undefined : null}
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
