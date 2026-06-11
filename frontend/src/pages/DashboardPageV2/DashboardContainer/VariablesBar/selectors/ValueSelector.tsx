import { SelectSimple } from '@signozhq/ui/select';

import type { VariableSelection } from '../selectionTypes';
import { ALL_SELECTED } from '../useVariableSelection';
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

/** Single/multi value picker for Custom/Query/Dynamic variables (options injected). */
function ValueSelector({
	options,
	multiSelect,
	showAllOption,
	loading,
	selection,
	onChange,
	testId,
}: ValueSelectorProps): JSX.Element {
	const items = [
		...(showAllOption && multiSelect
			? [{ label: 'ALL', value: ALL_SELECTED }]
			: []),
		...options.map((option) => ({ label: option, value: option })),
	];

	let value: string | string[];
	if (selection.allSelected) {
		value = multiSelect ? [ALL_SELECTED] : '';
	} else if (multiSelect) {
		value = (Array.isArray(selection.value) ? selection.value : []).map(String);
	} else {
		value = selection.value == null ? '' : String(selection.value);
	}

	const handleChange = (next: string | string[]): void => {
		const picksAll =
			next === ALL_SELECTED ||
			(Array.isArray(next) && next.includes(ALL_SELECTED));
		if (showAllOption && multiSelect && picksAll) {
			onChange({ value: options, allSelected: true });
			return;
		}
		onChange({ value: next, allSelected: false });
	};

	return (
		<SelectSimple
			className={styles.select}
			items={items}
			value={value}
			multiple={multiSelect}
			loading={loading}
			placeholder="Select"
			onChange={handleChange}
			testId={testId}
		/>
	);
}

export default ValueSelector;
