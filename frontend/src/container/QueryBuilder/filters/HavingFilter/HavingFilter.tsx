import { Color } from '@signozhq/design-tokens';
import { Select } from 'antd';
import { ENTITY_VERSION_V4 } from 'constants/app';
// ** Constants
import { HAVING_OPERATORS, initialHavingValues } from 'constants/queryBuilder';
import { HavingFilterTag } from 'container/QueryBuilder/components';
import { HavingTagRenderProps } from 'container/QueryBuilder/components/HavingFilterTag/HavingFilterTag.interfaces';
// ** Hooks
import { useTagValidation } from 'hooks/queryBuilder/useTagValidation';
import {
	transformFromStringToHaving,
	transformHavingToStringValue,
} from 'lib/query/transformQueryBuilderData';
// ** Helpers
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Having, HavingForm } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
import { popupContainer } from 'utils/selectPopupContainer';

import { getHavingObject, isValidHavingValue } from '../utils';
// ** Types
import { HavingFilterProps } from './HavingFilter.interfaces';

export function HavingFilter({
	entityVersion,
	query,
	onChange,
}: HavingFilterProps): JSX.Element {
	const { having } = query;
	const [searchText, setSearchText] = useState<string>('');
	const [options, setOptions] = useState<SelectOption<string, string>[]>([]);
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [currentFormValue, setCurrentFormValue] = useState<HavingForm>(
		initialHavingValues,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const { isMulti } = useTagValidation(
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

	const columnName = useMemo(() => {
		if (
			query &&
			query.dataSource === DataSource.METRICS &&
			query.spaceAggregation &&
			entityVersion === ENTITY_VERSION_V4
		) {
			return `${query.spaceAggregation.toUpperCase()}(${aggregatorAttribute})`;
		}

		return `${query.aggregateOperator.toUpperCase()}(${aggregatorAttribute})`;
	}, [query, aggregatorAttribute, entityVersion]);

	const aggregatorOptions: SelectOption<string, string>[] = useMemo(
		() => [{ label: columnName, value: columnName }],
		[columnName],
	);

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

	const handleSearch = useCallback(
		(search: string): void => {
			const trimmedSearch = search.replace(/\s\s+/g, ' ').trimStart();

			const currentSearch = isMulti
				? trimmedSearch
				: trimmedSearch.split(' ').slice(0, 3).join(' ');

			const isValidSearch = isValidHavingValue(currentSearch);

			if (isValidSearch) {
				setSearchText(currentSearch);
			}
		},
		[isMulti],
	);

	const resetChanges = useCallback((): void => {
		setSearchText('');
		setCurrentFormValue(initialHavingValues);
		setOptions(aggregatorOptions);
	}, [aggregatorOptions]);

	const handleChange = useCallback(
		(values: string[]): void => {
			const having: Having[] = values.map(transformFromStringToHaving);

			const isSelectable =
				currentFormValue.value.length > 0 &&
				currentFormValue.value.every((value) => !!value);

			if (isSelectable) {
				onChange(having);
				resetChanges();
			}
		},
		[currentFormValue, resetChanges, onChange],
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

	const tagRender = useCallback(
		({ label, value, closable, disabled, onClose }: HavingTagRenderProps) => {
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
		},
		[handleUpdateTag],
	);

	const handleSelect = (currentValue: string): void => {
		const { columnName, op, value } = getHavingObject(currentValue);

		const isCompletedValue = value.every((item) => !!item);

		const isClearSearch = isCompletedValue && columnName && op;

		setSearchText(isClearSearch ? '' : currentValue);
	};

	const parseSearchText = useCallback(
		(text: string) => {
			const { columnName, op, value } = getHavingObject(text);
			setCurrentFormValue({ columnName, op, value });

			generateOptions(text);
		},
		[generateOptions],
	);

	const handleDeselect = (value: string): void => {
		const result = localValues.filter((item) => item !== value);
		const having: Having[] = result.map(transformFromStringToHaving);
		onChange(having);
		resetChanges();
	};

	const handleFocus = useCallback(() => {
		setErrorMessage(null);
	}, []);

	const handleBlur = useCallback((): void => {
		if (searchText) {
			const { columnName, op, value } = getHavingObject(searchText);
			const isCompleteHavingClause =
				columnName && op && value.every((v) => v !== '');

			if (isCompleteHavingClause && isValidHavingValue(searchText)) {
				setLocalValues((prev) => {
					const updatedValues = [...prev, searchText];
					onChange(updatedValues.map(transformFromStringToHaving));
					return updatedValues;
				});
				setSearchText('');
			} else {
				setErrorMessage('Invalid HAVING clause');
			}
		}
	}, [searchText, onChange]);

	useEffect(() => {
		parseSearchText(searchText);
	}, [searchText, parseSearchText]);

	useEffect(() => {
		setLocalValues(transformHavingToStringValue(having));
	}, [having]);

	const isMetricsDataSource = query.dataSource === DataSource.METRICS;

	return (
		<>
			<Select
				getPopupContainer={popupContainer}
				autoClearSearchValue={false}
				mode="multiple"
				onSearch={handleSearch}
				searchValue={searchText}
				tagRender={tagRender}
				value={localValues}
				data-testid="havingSelect"
				disabled={isMetricsDataSource && !query.aggregateAttribute.key}
				style={{ width: '100%' }}
				notFoundContent={currentFormValue.value.length === 0 ? undefined : null}
				placeholder="GroupBy(operation) > 5"
				onDeselect={handleDeselect}
				onChange={handleChange}
				onSelect={handleSelect}
				onFocus={handleFocus}
				onBlur={handleBlur}
				status={errorMessage ? 'error' : undefined}
			>
				{options.map((opt) => (
					<Select.Option key={opt.value} value={opt.value} title="havingOption">
						{opt.label}
					</Select.Option>
				))}
			</Select>
			{errorMessage && (
				<div style={{ color: Color.BG_CHERRY_500 }}>{errorMessage}</div>
			)}
		</>
	);
}
