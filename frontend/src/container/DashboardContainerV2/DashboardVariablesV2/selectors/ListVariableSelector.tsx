import { useMemo } from 'react';
import SelectVariableInput from 'container/DashboardContainer/DashboardVariablesSelection/SelectVariableInput';
import { ALL_SELECT_VALUE } from 'container/DashboardContainer/utils';

import type { ResolvedValues } from '../resolution/types';
import type { VariableSelection } from '../state/types';

interface Props {
	variableId: string;
	resolved: ResolvedValues;
	selection: VariableSelection | undefined;
	allowMultiple: boolean;
	allowAllValue: boolean;
	defaultValue: string;
	onChange: (selection: VariableSelection) => void;
	onClear: () => void;
}

function selectionToValue(
	selection: VariableSelection | undefined,
	defaultValue: string,
	allowMultiple: boolean,
): string | string[] | undefined {
	if (selection && selection.kind === 'list') {
		if (selection.allSelected) return ALL_SELECT_VALUE;
		if (allowMultiple) return selection.values;
		return selection.values[0];
	}
	if (defaultValue) return allowMultiple ? [defaultValue] : defaultValue;
	return undefined;
}

/**
 * QUERY / CUSTOM / DYNAMIC variables share the same dropdown UX: a list of
 * options + an optional ALL entry + single / multi-select. Reuses V1's
 * `SelectVariableInput` so visuals match exactly.
 */
function ListVariableSelector({
	variableId,
	resolved,
	selection,
	allowMultiple,
	allowAllValue,
	defaultValue,
	onChange,
	onClear,
}: Props): JSX.Element {
	const options = useMemo(
		() => resolved.values.map((v) => ({ label: v, value: v })),
		[resolved.values],
	);

	const value = selectionToValue(selection, defaultValue, allowMultiple);

	return (
		<SelectVariableInput
			variableId={variableId}
			options={options}
			value={value}
			enableSelectAll={allowAllValue}
			isMultiSelect={allowMultiple}
			loading={resolved.status === 'loading'}
			errorMessage={resolved.error ?? null}
			onChange={(next): void => {
				if (Array.isArray(next)) {
					// Multi-select. Antd's CustomMultiSelect emits the ALL sentinel
					// when the user toggles the "Select all" row.
					const hasAll = next.includes(ALL_SELECT_VALUE);
					onChange({
						kind: 'list',
						values: hasAll ? [] : next,
						allSelected: hasAll,
					});
				} else if (next === ALL_SELECT_VALUE) {
					onChange({ kind: 'list', values: [], allSelected: true });
				} else {
					onChange({
						kind: 'list',
						values: next ? [next] : [],
						allSelected: false,
					});
				}
			}}
			onClear={onClear}
		/>
	);
}

export default ListVariableSelector;
