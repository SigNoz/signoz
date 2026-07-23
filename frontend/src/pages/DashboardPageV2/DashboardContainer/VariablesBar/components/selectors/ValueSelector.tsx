import { useMemo } from 'react';
import logEvent from 'api/common/logEvent';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import type { OptionData } from 'components/NewSelect/types';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import type { VariableSelection } from '../../selectionTypes';
import styles from '../../VariablesBar.module.scss';

interface ValueSelectorProps {
	options: string[];
	/** Analytics label for the variable type (query / custom / dynamic). */
	variableType: string;
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
	variableType,
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
				// Offer ALL only once options load, else a concrete value reads as "all".
				enableAllSelection={showAllOption && options.length > 0}
				onChange={(next): void => {
					const values = Array.isArray(next)
						? next.map(String)
						: next
							? [String(next)]
							: [];
					void logEvent(
						DashboardDetailEvents.VariableValueSelected,
						{ variableType, multiSelect: true, selectionCount: values.length },
						'track',
						true,
					);
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
				onClear={(): void => {
					void logEvent(DashboardDetailEvents.VariableMultiSelectCleared, {
						variableType,
					});
					onChange({ value: [], allSelected: false });
				}}
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
			onChange={(next): void => {
				void logEvent(
					DashboardDetailEvents.VariableValueSelected,
					{ variableType, multiSelect: false, selectionCount: next == null ? 0 : 1 },
					'track',
					true,
				);
				onChange({ value: next == null ? '' : String(next), allSelected: false });
			}}
		/>
	);
}

export default ValueSelector;
