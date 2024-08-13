import './alertHistory.styles.scss';

import Statistics from './Statistics/Statistics';
import Timeline from './Timeline/Timeline';

function AlertHistory(): JSX.Element {
	return (
		<div className="alert-history">
			<Statistics />
			<Timeline />
		</div>
	);
}

export default AlertHistory;
