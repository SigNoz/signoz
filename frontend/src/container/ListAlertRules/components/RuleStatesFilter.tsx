import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import MultiSelectFilter, {
	type MultiSelectFilterOption,
} from 'components/ListFilter/FilterZone/MultiSelectFilter';

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
	return (
		<MultiSelectFilter
			value={states}
			options={STATE_OPTIONS}
			placeholder="State"
			testId="alert-rules-filter-states"
			onChange={onChange}
		/>
	);
}

export default RuleStatesFilter;
