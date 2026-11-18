import MultiSelectFilter from 'components/ListFilter/FilterZone/MultiSelectFilter';

import { SERVICE_ACCOUNTS_STATUS_OPTIONS } from './list.config';
import { statusesOfQuery, withStatuses } from './utils';

interface Props {
	draft: string;
	disabled: boolean;
	onApplyDraft: (next: string) => void;
	setDraft: (newDraft: string) => void;
}

// Picks splice into the draft and run when the dropdown closes; Clear runs at
// once. A status term the box holds with another operator shows as nothing
// picked.
function ServiceAccountStatusFilter({
	draft,
	disabled,
	onApplyDraft,
	setDraft,
}: Props): JSX.Element {
	return (
		<MultiSelectFilter
			value={statusesOfQuery(draft)}
			options={SERVICE_ACCOUNTS_STATUS_OPTIONS}
			placeholder="Status"
			testId="sa-filter-status"
			disabled={disabled}
			onChange={(statuses): void => setDraft(withStatuses(draft, statuses))}
			onClear={(): void => onApplyDraft(withStatuses(draft, []))}
			onDropdownVisibleChange={(open): void => {
				if (!open) {
					onApplyDraft(draft);
				}
			}}
		/>
	);
}

export default ServiceAccountStatusFilter;
