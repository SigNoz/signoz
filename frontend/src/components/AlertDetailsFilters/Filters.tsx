import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';

import './Filters.styles.scss';

export function Filters(): JSX.Element {
	return (
		<div className="filters">
			<DateTimeSelector showAutoRefresh={false} hideShareModal showResetButton />
		</div>
	);
}
