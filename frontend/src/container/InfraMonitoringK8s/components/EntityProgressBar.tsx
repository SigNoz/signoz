import { Progress } from 'antd';
import TanStackTable from 'components/TanStackTableView';
import {
	getMemoryProgressColor,
	getProgressColor,
} from 'container/InfraMonitoringHosts/constants';

import {
	getStrokeColorForLimitUtilization,
	getStrokeColorForRequestUtilization,
} from '../commonUtils';

import styles from './EntityProgressBar.module.scss';

type EntityProgressBarType = 'request' | 'limit' | 'cpu' | 'memory';

function getStrokeColor(type: EntityProgressBarType, value: number): string {
	switch (type) {
		case 'limit':
			return getStrokeColorForLimitUtilization(value);
		case 'request':
			return getStrokeColorForRequestUtilization(value);
		case 'cpu':
			return getProgressColor(Number((value * 100).toFixed(1)));
		case 'memory':
			return getMemoryProgressColor(Number((value * 100).toFixed(1)));
		default:
			return getStrokeColorForRequestUtilization(value);
	}
}

export function EntityProgressBar({
	value,
	type,
}: {
	value: number;
	type: EntityProgressBarType;
}): JSX.Element {
	const percentage = Number.isNaN(+value)
		? null
		: Number((value * 100).toFixed(1));

	if (percentage === null) {
		return (
			<div className={styles.entityProgressBar}>
				<TanStackTable.Text>-</TanStackTable.Text>
			</div>
		);
	}

	return (
		<div className={styles.entityProgressBar}>
			<Progress
				percent={percentage}
				strokeLinecap="butt"
				size="small"
				status="normal"
				strokeColor={getStrokeColor(type, value)}
				className={styles.progressBar}
				showInfo={false}
			/>
			<TanStackTable.Text>{percentage}%</TanStackTable.Text>
		</div>
	);
}
