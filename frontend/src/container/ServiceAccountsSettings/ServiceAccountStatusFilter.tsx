import { useCallback } from 'react';
import MultiSelectFilter from 'components/ListFilter/FilterZone/MultiSelectFilter';

import { SERVICE_ACCOUNTS_STATUS_OPTIONS } from './list.config';
import { statusesOfQuery, withStatuses } from './utils';

interface Props {
	draft: string;
	disabled: boolean;
	onApplyDraft: (next: string) => void;
	setDraft: (newDraft: string) => void;
}

// Picks splice into the draft and run when the dropdown closes; a tag's × or
// Clear runs at once. A status term the box holds with another operator shows
// as nothing picked.
function ServiceAccountStatusFilter({
	draft,
	disabled,
	onApplyDraft,
	setDraft,
}: Props): JSX.Element {
	const handleChange = useCallback(
		(statuses: string[]): void => setDraft(withStatuses(draft, statuses)),
		[draft, setDraft],
	);

	const handleCommit = useCallback(
		(statuses: string[]): void => onApplyDraft(withStatuses(draft, statuses)),
		[draft, onApplyDraft],
	);

	const handleDropdownVisibleChange = useCallback(
		(isOpen: boolean): void => {
			if (!isOpen) {
				onApplyDraft(draft);
			}
		},
		[draft, onApplyDraft],
	);

	return (
		<MultiSelectFilter
			value={statusesOfQuery(draft)}
			options={SERVICE_ACCOUNTS_STATUS_OPTIONS}
			placeholder="Status"
			testId="sa-filter-status"
			disabled={disabled}
			onChange={handleChange}
			onCommit={handleCommit}
			onDropdownVisibleChange={handleDropdownVisibleChange}
		/>
	);
}

export default ServiceAccountStatusFilter;
