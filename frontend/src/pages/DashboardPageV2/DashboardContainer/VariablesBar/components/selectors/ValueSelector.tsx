import { useMemo, useState } from 'react';
import logEvent from 'api/common/logEvent';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import type { OptionData } from 'components/NewSelect/types';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import type { VariableSelection } from '../../selectionTypes';
import { areSelectionsEqual } from '../../utils/resolveVariableSelection';
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
	emptyFallback: VariableSelection;
	testId?: string;
	/** Option-fetch error surfaced in the dropdown, with a retry action. */
	errorMessage?: string | null;
	onRetry?: () => void;
}

function ValueSelector({
	options,
	variableType,
	multiSelect,
	showAllOption,
	loading,
	selection,
	onChange,
	emptyFallback,
	testId,
	errorMessage,
	onRetry,
}: ValueSelectorProps): JSX.Element {
	const optionData = useMemo<OptionData[]>(
		() => options.map((option) => ({ label: option, value: option })),
		[options],
	);

	// All-selected → the full option set so CustomMultiSelect engages its "all"
	// path (overlay when closed, every option checked when open). The scalar
	// sentinel would instead render a literal `__ALL__` row.
	const committedValues = useMemo<string[]>(
		() =>
			selection.allSelected
				? options
				: (Array.isArray(selection.value) ? selection.value : []).map(String),
		[selection, options],
	);

	// Buffer edits while the dropdown is open; the committed selection is shown
	// when closed. This defers the dependent cascade to a single commit-on-close.
	const [isOpen, setIsOpen] = useState(false);
	const [draft, setDraft] = useState<string[]>(committedValues);

	const commit = (values: string[]): void => {
		// CustomMultiSelect emits the full value set when ALL is picked.
		const isAll =
			showAllOption &&
			options.length > 0 &&
			options.every((option) => values.includes(option));
		const next: VariableSelection =
			values.length === 0 ? emptyFallback : { value: values, allSelected: isAll };

		// Closing without actually changing the selection must not re-fire onChange —
		// that would needlessly re-cascade to dependent variables/panels.
		if (areSelectionsEqual(next, selection)) {
			return;
		}

		void logEvent(
			DashboardDetailEvents.VariableValueSelected,
			{ variableType, multiSelect: true, selectionCount: values.length },
			'track',
			true,
		);
		onChange(next);
	};

	if (multiSelect) {
		return (
			<CustomMultiSelect
				className={styles.control}
				data-testid={testId}
				options={optionData}
				value={isOpen ? draft : committedValues}
				loading={loading}
				errorMessage={errorMessage}
				onRetry={onRetry}
				showSearch
				allowClear
				placeholder="Select value"
				maxTagCount={1}
				maxTagTextLength={10}
				maxTagPlaceholder={(omitted): string => `+${omitted.length}`}
				// Offer ALL only once options load, else a concrete value reads as "all".
				enableAllSelection={showAllOption && options.length > 0}
				onDropdownVisibleChange={(open): void => {
					if (open) {
						setDraft(committedValues);
						setIsOpen(true);
						return;
					}

					setIsOpen(false);
					commit(draft);
				}}
				onChange={(next): void => {
					const values = Array.isArray(next)
						? next.map(String)
						: next
							? [String(next)]
							: [];
					setDraft(values);
				}}
				onClear={(): void => {
					void logEvent(DashboardDetailEvents.VariableMultiSelectCleared, {
						variableType,
					});
					setDraft([]);
					// A clear on the closed control falls back to the default immediately;
					// while open it just empties the draft (committed on close).
					if (!isOpen) {
						onChange(emptyFallback);
					}
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
