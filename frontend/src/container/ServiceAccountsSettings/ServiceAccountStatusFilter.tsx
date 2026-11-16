import { useEffect, useState } from 'react';
import MultiSelectFilter from 'components/ListFilter/FilterZone/MultiSelectFilter';

import { SERVICE_ACCOUNTS_STATUS_OPTIONS } from './list.config';
import { sameStatuses, statusesOfQuery, withStatuses } from './utils';

interface Props {
	query: string;
	disabled: boolean;
	onQueryChange: (query: string) => void;
}

// Picks stage locally and apply to the last-run query when the dropdown closes;
// Clear applies at once. A status term the box holds with another operator
// shows as nothing picked, and closing without a pick leaves it untouched.
function ServiceAccountStatusFilter({
	query,
	disabled,
	onQueryChange,
}: Props): JSX.Element {
	const reflected = statusesOfQuery(query);
	const [picked, setPicked] = useState<string[]>(reflected);

	useEffect(() => {
		setPicked(statusesOfQuery(query));
	}, [query]);

	const apply = (statuses: string[]): void => {
		onQueryChange(withStatuses(query, statuses));
	};

	return (
		<MultiSelectFilter
			value={picked}
			options={SERVICE_ACCOUNTS_STATUS_OPTIONS}
			placeholder="Status"
			testId="sa-filter-status"
			disabled={disabled}
			onChange={setPicked}
			onClear={(): void => apply([])}
			onDropdownVisibleChange={(open): void => {
				if (!open && !sameStatuses(picked, reflected)) {
					apply(picked);
				}
			}}
		/>
	);
}

export default ServiceAccountStatusFilter;
