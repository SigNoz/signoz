import { useEffect, useState } from 'react';
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
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setDraft(states);
	}, [states]);

	const handleChange = (next: string[]): void => {
		setDraft(next);
		if (!open) {
			onChange(next);
		}
	};

	const handleDropdownVisibleChange = (nextOpen: boolean): void => {
		setOpen(nextOpen);
		if (!nextOpen && !isSameStates(draft, states)) {
			onChange(draft);
		}
	};

	return (
		<MultiSelectFilter
			value={draft}
			options={STATE_OPTIONS}
			placeholder="State"
			testId="alert-rules-filter-states"
			onChange={handleChange}
			onDropdownVisibleChange={handleDropdownVisibleChange}
		/>
	);
}

export default RuleStatesFilter;
