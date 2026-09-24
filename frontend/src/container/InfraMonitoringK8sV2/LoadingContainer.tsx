import { Skeleton } from 'antd';

import styles from './LoadingContainer.module.scss';

function LoadingContainer(): JSX.Element {
	return (
		<div className={styles.loadingState} data-testid="loader">
			<Skeleton.Input
				className={styles.loadingStateItem}
				size="large"
				block
				active
			/>
			<Skeleton.Input
				className={styles.loadingStateItem}
				size="large"
				block
				active
			/>
			<Skeleton.Input
				className={styles.loadingStateItem}
				size="large"
				block
				active
			/>
		</div>
	);
}

export default LoadingContainer;
