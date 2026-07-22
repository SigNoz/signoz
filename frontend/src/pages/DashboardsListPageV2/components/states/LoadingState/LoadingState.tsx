import { Skeleton } from 'antd';

import styles from './LoadingState.module.scss';

const ROWS = [0, 1, 2, 3, 4];

function LoadingState(): JSX.Element {
	return (
		<div className={styles.wrapper}>
			{ROWS.map((row) => (
				<Skeleton.Input key={row} active block className={styles.skeleton} />
			))}
		</div>
	);
}

export default LoadingState;
