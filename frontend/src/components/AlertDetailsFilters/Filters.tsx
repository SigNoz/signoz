import './Filters.styles.scss';

import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';

export function Filters(): JSX.Element {
	return (
		<div className="filters">
			<DateTimeSelector showAutoRefresh={false} hideShareModal showResetButton />
		</div>
	);
}
