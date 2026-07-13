import { useMemo } from 'react';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import type { OptionData } from 'components/NewSelect/types';

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
	/** Option-fetch error surfaced in the dropdown, with a retry action. */
	errorMessage?: string | null;
	onRetry?: () => void;
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
	errorMessage,
	onRetry,
}: ValueSelectorProps): JSX.Element {
	const optionData = useMemo<OptionData[]>(
		() => options.map((option) => ({ label: option, value: option })),
		[options],
	);

	if (multiSelect) {
		// All-selected → hand CustomMultiSelect the full option set so it engages its
		// "all" path (overlay when closed, every option checked when open). Passing the
		// scalar sentinel instead makes it render a literal `__ALL__` row.
		const value = selection.allSelected
			? options
			: (Array.isArray(selection.value) ? selection.value : []).map(String);
		return (
			<CustomMultiSelect
				className={styles.control}
				data-testid={testId}
				options={optionData}
				value={value}
				loading={loading}
				errorMessage={errorMessage}
				onRetry={onRetry}
				showSearch
				placeholder="Select value"
				maxTagCount={2}
				maxTagTextLength={20}
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
			className={styles.control}
			data-testid={testId}
			options={optionData}
			value={
				selection.value == null || Array.isArray(selection.value)
					? undefined
					: String(selection.value)
			}
			loading={loading}
			errorMessage={errorMessage}
			onRetry={onRetry}
			showSearch
			placeholder="Select value"
			onChange={(next): void =>
				onChange({ value: next == null ? '' : String(next), allSelected: false })
			}
		/>
	);
}

export default ValueSelector;
