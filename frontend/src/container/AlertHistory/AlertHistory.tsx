import { useState } from 'react';

import Statistics from './Statistics/Statistics';
import Timeline from './Timeline/Timeline';

import './AlertHistory.styles.scss';

function AlertHistory(): JSX.Element {
	const [totalCurrentTriggers, setTotalCurrentTriggers] = useState(0);

	return (
		<div className="alert-history">
			<Statistics
				totalCurrentTriggers={totalCurrentTriggers}
				setTotalCurrentTriggers={setTotalCurrentTriggers}
			/>
			<Timeline totalCurrentTriggers={totalCurrentTriggers} />
		</div>
	);
}

export default AlertHistory;
