// ** Helpers
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { ENTITY_VERSION_V4 } from 'constants/app';
// ** Constants
import { HAVING_OPERATORS, initialHavingValues } from 'constants/queryBuilder';
// ** Hooks
import { useTagValidation } from 'hooks/queryBuilder/useTagValidation';
import {
	transformFromStringToHaving,
	transformHavingToStringValue,
} from 'lib/query/transformQueryBuilderData';
import { uniqWith } from 'lodash-es';
import { Having, HavingForm } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

import { getHavingObject, isValidHavingValue } from '../utils';
// ** Types
import { HavingFilterProps } from './HavingFilter.interfaces';

export function HavingFilter({
	entityVersion,
	query,
	onChange,
}: HavingFilterProps): JSX.Element {
	const { having } = query;
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [currentFormValue, setCurrentFormValue] =
		useState<HavingForm>(initialHavingValues);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useTagValidation(currentFormValue.op, currentFormValue.value);

	const aggregatorAttribute = useMemo(
		() => query.aggregateAttribute?.key || '',
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

		return `${
			query.aggregateOperator?.toUpperCase() || ''
		}(${aggregatorAttribute})`;
	}, [query, aggregatorAttribute, entityVersion]);

	const aggregatorOptions: SelectOption<string, string>[] = useMemo(
		() => [{ label: columnName, value: columnName }],
		[columnName],
	);

	const generatedOptions: SelectOption<string, string>[] = useMemo(() => {
		const operatorOptions: SelectOption<string, string>[] = HAVING_OPERATORS.map(
			(op) => ({
				label: `${columnName} ${op} `,
				value: `${columnName} ${op} `,
			}),
		);
		return [...aggregatorOptions, ...operatorOptions];
	}, [aggregatorOptions, columnName]);

	const items: ComboboxSimpleItem[] = useMemo(() => {
		const merged: SelectOption<string, string>[] = [
			...localValues.map((v) => ({ label: v, value: v })),
			...generatedOptions,
		];
		const unique = uniqWith(merged, (a, b) => a.value === b.value);
		return unique.map((opt) => ({
			label: opt.label,
			displayValue: opt.label,
			value: opt.value,
		}));
	}, [generatedOptions, localValues]);

	const handleChange = useCallback(
		(next: string | string[]): void => {
			const values = (next as string[]) || [];
			const validValues = values.filter((v) => {
				const { columnName, op, value } = getHavingObject(v);
				if (!columnName || !op || value.length === 0 || !value.every((x) => !!x)) {
					return false;
				}
				return isValidHavingValue(v);
			});

			if (validValues.length === values.length) {
				const havingResult: Having[] = validValues.map(transformFromStringToHaving);
				onChange(havingResult);
				setCurrentFormValue(initialHavingValues);
				setErrorMessage(null);
			} else {
				setErrorMessage('Invalid HAVING clause');
			}
		},
		[onChange],
	);

	useEffect(() => {
		setLocalValues(transformHavingToStringValue(having as Having[]));
	}, [having]);

	const isMetricsDataSource = query.dataSource === DataSource.METRICS;
	const isDisabled = isMetricsDataSource && !query.aggregateAttribute?.key;

	// Note: ComboboxSimple does not support disabled prop natively;
	// when disabled we render with pointer-events: none + reduced opacity.
	return (
		<>
			<ComboboxSimple
				multiple
				allowCreate
				testId="havingSelect"
				placeholder="GroupBy(operation) > 5"
				style={{
					width: '100%',
					...(isDisabled && { pointerEvents: 'none', opacity: 0.5 }),
				}}
				items={items}
				value={localValues}
				onChange={handleChange}
			/>
			{errorMessage && (
				<div style={{ color: Color.BG_CHERRY_500 }}>{errorMessage}</div>
			)}
		</>
	);
}
