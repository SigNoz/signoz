import { Select } from 'antd';
import { HAVING_OPERATORS, initialHavingValues } from 'constants/queryBuilder';
import { HavingFilterTag } from 'container/QueryBuilder/components';
import { useTagValidation } from 'hooks/queryBuilder/useTagValidation';
import {
	transformFromStringToHaving,
	transformHavingToStringValue,
} from 'lib/query/transformQueryBuilderData';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Having, HavingForm } from 'types/api/queryBuilder/queryBuilderData';
import { SelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';

import { getHavingObject, isValidHavingValue } from '../../utils';
import { HavingFilterProps, HavingTagRenderProps } from './types';

function HavingFilter({ formula, onChange }: HavingFilterProps): JSX.Element {
	const { having } = formula;
	const [searchText, setSearchText] = useState<string>('');
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [currentFormValue, setCurrentFormValue] = useState<HavingForm>(
		initialHavingValues,
	);
	const [options, setOptions] = useState<SelectOption<string, string>[]>([]);

	const { isMulti } = useTagValidation(
		currentFormValue.op,
		currentFormValue.value,
	);

	const columnName = formula.expression.replace(/ /g, '').toUpperCase();

	const aggregatorOptions: SelectOption<string, string>[] = useMemo(
		() => [{ label: columnName, value: columnName }],
		[columnName],
	);

	const handleUpdateTag = useCallback(
		(value: string) => {
			const filteredValues = localValues.filter(
				(currentValue) => currentValue !== value,
			);
			const having: Having[] = filteredValues.map(transformFromStringToHaving);

			onChange(having);
			setSearchText(value);
		},
		[localValues, onChange],
	);

	const generateOptions = useCallback(
		(currentString: string) => {
			const [aggregator = '', op = '', ...restValue] = currentString.split(' ');
			let newOptions: SelectOption<string, string>[] = [];

			const isAggregatorExist = columnName
				.toLowerCase()
				.includes(currentString.toLowerCase());

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
		[aggregatorOptions, columnName],
	);

	const parseSearchText = useCallback(
		(text: string) => {
			const { columnName, op, value } = getHavingObject(text);
			setCurrentFormValue({ columnName, op, value });

			generateOptions(text);
		},
		[generateOptions],
	);

	const tagRender = ({
		label,
		value,
		closable,
		disabled,
		onClose,
	}: HavingTagRenderProps): JSX.Element => {
		const handleClose = (): void => {
			onClose();
			setSearchText('');
		};
		return (
			<HavingFilterTag
				label={label}
				value={value}
				closable={closable}
				disabled={disabled}
				onClose={handleClose}
				onUpdate={handleUpdateTag}
			/>
		);
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

	useEffect(() => {
		setLocalValues(transformHavingToStringValue(having || []));
	}, [having]);

	useEffect(() => {
		parseSearchText(searchText);
	}, [searchText, parseSearchText]);

	const resetChanges = (): void => {
		setSearchText('');
		setCurrentFormValue(initialHavingValues);
		setOptions(aggregatorOptions);
	};

	const handleDeselect = (value: string): void => {
		const result = localValues.filter((item) => item !== value);
		const having: Having[] = result.map(transformFromStringToHaving);
		onChange(having);
		resetChanges();
	};

	const handleSelect = (currentValue: string): void => {
		const { columnName, op, value } = getHavingObject(currentValue);

		const isCompletedValue = value.every((item) => !!item);

		const isClearSearch = isCompletedValue && columnName && op;

		setSearchText(isClearSearch ? '' : currentValue);
	};

	const handleChange = (values: string[]): void => {
		const having: Having[] = values.map(transformFromStringToHaving);

		const isSelectable =
			currentFormValue.value.length > 0 &&
			currentFormValue.value.every((value) => !!value);

		if (isSelectable) {
			onChange(having);
			resetChanges();
		}
	};

	return (
		<Select
			getPopupContainer={popupContainer}
			autoClearSearchValue={false}
			mode="multiple"
			onSearch={handleSearch}
			searchValue={searchText}
			data-testid="havingSelectFormula"
			placeholder="Count(operation) > 5"
			style={{ width: '100%' }}
			tagRender={tagRender}
			onDeselect={handleDeselect}
			onSelect={handleSelect}
			onChange={handleChange}
			value={localValues}
		>
			{options.map((opt) => (
				<Select.Option key={opt.value} value={opt.value} title="havingOption">
					{opt.label}
				</Select.Option>
			))}
		</Select>
	);
}

export default HavingFilter;
