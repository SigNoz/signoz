import { useCallback, useEffect, useState } from 'react';
import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import MultiSelectFilter, {
	type MultiSelectFilterOption,
} from 'components/ListFilter/FilterZone/MultiSelectFilter';

import { isSameStates } from '../utils';

const STATE_OPTIONS: MultiSelectFilterOption[] = [
	{ value: RuletypesAlertStateDTO.firing, label: 'Firing' },
	{ value: RuletypesAlertStateDTO.pending, label: 'Pending' },
	{ value: RuletypesAlertStateDTO.recovering, label: 'Recovering' },
	{ value: RuletypesAlertStateDTO.inactive, label: 'OK' },
	{ value: RuletypesAlertStateDTO.nodata, label: 'No data' },
	{ value: RuletypesAlertStateDTO.disabled, label: 'Disabled' },
];

interface RuleStatesFilterProps {
	states: string[];
	onChange: (states: string[]) => void;
}

function RuleStatesFilter({
	states,
	onChange,
}: RuleStatesFilterProps): JSX.Element {
	const [draft, setDraft] = useState(states);

	useEffect(() => {
		setDraft(states);
	}, [states]);

	const handleCommit = useCallback(
		(next: string[]): void => {
			setDraft(next);
			onChange(next);
		},
		[onChange],
	);

	const handleDropdownVisibleChange = useCallback(
		(isOpen: boolean): void => {
			if (!isOpen && !isSameStates(draft, states)) {
				onChange(draft);
			}
		},
		[draft, states, onChange],
	);

	return (
		<MultiSelectFilter
			value={draft}
			options={STATE_OPTIONS}
			placeholder="Status"
			testId="alert-rules-filter-states"
			onChange={setDraft}
			onCommit={handleCommit}
			onDropdownVisibleChange={handleDropdownVisibleChange}
		/>
	);
}

export default RuleStatesFilter;
