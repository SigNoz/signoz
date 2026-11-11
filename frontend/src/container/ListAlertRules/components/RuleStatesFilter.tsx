import { useCallback } from 'react';
import { ComboboxSimple, type ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './RuleStatesFilter.module.scss';

const STATE_ITEMS: ComboboxSimpleItem[] = [
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
	const handleChange = useCallback(
		(values: unknown): void => {
			if (Array.isArray(values)) {
				onChange(values as string[]);
			}
		},
		[onChange],
	);

	return (
		<ComboboxSimple
			className={styles.statesSelect}
			multiple
			value={states}
			onChange={handleChange}
			placeholder="Filter by state"
			inputPlaceholder="Select one or more"
			items={STATE_ITEMS}
			maxDisplayedPills={2}
			testId="alert-rules-filter-states"
		/>
	);
}

export default RuleStatesFilter;
