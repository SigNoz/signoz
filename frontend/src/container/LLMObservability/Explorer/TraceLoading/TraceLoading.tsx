import { Typography } from '@signozhq/ui/typography';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';

import styles from './TraceLoading.module.scss';

export function TracesLoading(): JSX.Element {
	return (
		<div className={styles.loadingTraces}>
			<div className={styles.content}>
				<img className={styles.gif} src={loadingPlaneUrl} alt="wait-icon" />

				<Typography>Retrieving your traces!</Typography>
			</div>
		</div>
	);
}
