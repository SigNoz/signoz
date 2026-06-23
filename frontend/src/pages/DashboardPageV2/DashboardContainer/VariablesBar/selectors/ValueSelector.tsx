import { useMemo } from 'react';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import type { OptionData } from 'components/NewSelect/types';
import { ALL_SELECT_VALUE } from 'container/DashboardContainer/utils';

import type { VariableSelection } from '../selectionTypes';
import styles from '../VariablesBar.module.scss';

interface ValueSelectorProps {
	options: string[];
	multiSelect: boolean;
	showAllOption: boolean;
	loading?: boolean;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	testId?: string;
}

/**
 * Single/multi value picker for Custom/Query/Dynamic variables. Reuses the
 * shared NewSelect components, which provide search, the "ALL" option and
 * apply-on-close batching (so multi-select edits don't cascade per toggle).
 */
function ValueSelector({
	options,
	multiSelect,
	showAllOption,
	loading,
	selection,
	onChange,
	testId,
}: ValueSelectorProps): JSX.Element {
	const optionData = useMemo<OptionData[]>(
		() => options.map((option) => ({ label: option, value: option })),
		[options],
	);

	if (multiSelect) {
		const value = selection.allSelected
			? ALL_SELECT_VALUE
			: (Array.isArray(selection.value) ? selection.value : []).map(String);
		return (
			<CustomMultiSelect
				className={styles.control}
				data-testid={testId}
				options={optionData}
				value={value}
				loading={loading}
				showSearch
				placeholder="Select value"
				enableAllSelection={showAllOption}
				onChange={(next): void => {
					const values = Array.isArray(next)
						? next.map(String)
						: next
							? [String(next)]
							: [];
					if (values.length === 0) {
						onChange({ value: [], allSelected: false });
						return;
					}
					// CustomMultiSelect emits the full value set when ALL is picked.
					const isAll =
						showAllOption &&
						options.length > 0 &&
						options.every((option) => values.includes(option));
					onChange({ value: values, allSelected: isAll });
				}}
				onClear={(): void => onChange({ value: [], allSelected: false })}
			/>
		);
	}

	return (
		<CustomSelect
			className={styles.select}
			data-testid={testId}
			options={optionData}
			value={
				selection.value == null || Array.isArray(selection.value)
					? undefined
					: String(selection.value)
			}
			loading={loading}
			showSearch
			placeholder="Select value"
			onChange={(next): void =>
				onChange({ value: next == null ? '' : String(next), allSelected: false })
			}
		/>
	);
}

export default ValueSelector;
