import { Progress } from 'antd';
import TanStackTable from 'components/TanStackTableView';

import {
	getStrokeColorForLimitUtilization,
	getStrokeColorForRequestUtilization,
} from '../commonUtils';

import styles from './EntityProgressBar.module.scss';

export function EntityProgressBar({
	value,
	type,
}: {
	value: number;
	type: 'request' | 'limit';
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
				strokeColor={
					type === 'limit'
						? getStrokeColorForLimitUtilization(value)
						: getStrokeColorForRequestUtilization(value)
				}
				className={styles.progressBar}
				showInfo={false}
			/>
			<TanStackTable.Text>{percentage}%</TanStackTable.Text>
		</div>
	);
}
