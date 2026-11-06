import { Progress } from '@signozhq/ui/progress';
import TanStackTable from 'components/TanStackTableView';

import styles from './EntityProgressBar.module.scss';
import {
	EntityProgressBarType,
	getProgressColor,
} from './EntityProgressBar.utils';

export function EntityProgressBar({
	value,
	type,
}: {
	value: number;
	type: EntityProgressBarType;
}): JSX.Element {
	const isNoData = value === -1 || Number.isNaN(+value);
	const percentage = isNoData ? null : Number((value * 100).toFixed(1));

	if (percentage === null) {
		return (
			<div className={styles.entityProgressBar}>
				<TanStackTable.Text>-</TanStackTable.Text>
			</div>
		);
	}

	return (
		<div className={styles.entityProgressBar}>
			<div className={styles.progressBar}>
				<Progress
					percent={percentage}
					color={getProgressColor(type, value)}
					showInfo={false}
				/>
			</div>
			<TanStackTable.Text>{percentage}%</TanStackTable.Text>
		</div>
	);
}
