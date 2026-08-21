import { useMemo, useState } from 'react';
import logEvent from 'api/common/logEvent';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import type { OptionData } from 'components/NewSelect/types';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import type { VariableSelection } from '../../selectionTypes';
import { areSelectionsEqual } from '../../utils/resolveVariableSelection';
import { selectionFromCommittedValues } from '../../utils/selectionUtils';
import OverflowValuesTooltip from './OverflowValuesTooltip';
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

	// That "all" path needs the options, so an ALL selection whose options have not
	// arrived yet has nothing to render and the control would read "Select value"
	// while it spins — as if nothing were selected. Say ALL in that slot instead: the
	// selection is known, only its options are pending. Display only, so it can never
	// be committed as a value.
	const isAllPendingOptions = selection.allSelected && options.length === 0;

	// Buffer edits while the dropdown is open; the committed selection is shown
	// when closed. This defers the dependent cascade to a single commit-on-close.
	const [isOpen, setIsOpen] = useState(false);
	const [draft, setDraft] = useState<string[]>(committedValues);

	// ALL is every option, so there is nothing to clear — and the shared control refuses
	// to empty an ALL selection anyway, which would leave the icon inert. Unchecking ALL
	// in the list is the way out of it.
	const draftIsAll =
		showAllOption &&
		options.length > 0 &&
		options.every((option) => draft.includes(option));

	const commit = (values: string[]): void => {
		// A close that left the list as it opened commits nothing — else a pick covering
		// every option this window offers would be promoted to a standing ALL.
		if (
			areSelectionsEqual(
				{ value: values, allSelected: false },
				{ value: committedValues, allSelected: false },
			)
		) {
			return;
		}

		const next = selectionFromCommittedValues({
			values,
			options,
			showAllOption,
			emptyFallback,
		});

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
				// Clearing belongs to the open list: on the closed control the icon would
				// appear on hover, in a row of variable pills, for an action whose result is
				// not visible.
				allowClear={isOpen && !draftIsAll}
				placeholder={isAllPendingOptions ? 'ALL' : 'Select value'}
				maxTagCount={1}
				maxTagTextLength={10}
				maxTagPlaceholder={(omitted): JSX.Element => (
					<OverflowValuesTooltip
						values={omitted.map((item) =>
							typeof item.label === 'string' ? item.label : String(item.value ?? ''),
						)}
					/>
				)}
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
					// Empties the list, committing nothing. Closing resolves an empty draft
					// to whatever the variable should hold — its configured default, else ALL
					// where it offers one, else the first option.
					setDraft([]);
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
