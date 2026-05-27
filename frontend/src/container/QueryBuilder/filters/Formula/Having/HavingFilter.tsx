import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { HAVING_OPERATORS, initialHavingValues } from 'constants/queryBuilder';
import { useTagValidation } from 'hooks/queryBuilder/useTagValidation';
import {
	transformFromStringToHaving,
	transformHavingToStringValue,
} from 'lib/query/transformQueryBuilderData';
import { uniqWith } from 'lodash-es';
import { Having, HavingForm } from 'types/api/queryBuilder/queryBuilderData';
import { SelectOption } from 'types/common/select';

import { getHavingObject } from '../../utils';
import { HavingFilterProps } from './types';

function HavingFilter({ formula, onChange }: HavingFilterProps): JSX.Element {
	const { having } = formula;
	const [localValues, setLocalValues] = useState<string[]>([]);
	const [currentFormValue, setCurrentFormValue] =
		useState<HavingForm>(initialHavingValues);

	useTagValidation(currentFormValue.op, currentFormValue.value);

	const columnName = formula.expression.replace(/ /g, '').toUpperCase();

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

	useEffect(() => {
		setLocalValues(transformHavingToStringValue(having || []));
	}, [having]);

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
				return columnName && op && value.length > 0 && value.every((x) => !!x);
			});

			if (validValues.length === values.length) {
				const havingResult: Having[] = validValues.map(transformFromStringToHaving);
				onChange(havingResult);
				setCurrentFormValue(initialHavingValues);
			}
		},
		[onChange],
	);

	return (
		<ComboboxSimple
			multiple
			allowCreate
			testId="havingSelectFormula"
			placeholder="Count(operation) > 5"
			style={{ width: '100%' }}
			items={items}
			value={localValues}
			onChange={handleChange}
		/>
	);
}

export default HavingFilter;
