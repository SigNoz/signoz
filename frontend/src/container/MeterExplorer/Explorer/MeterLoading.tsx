import { Typography } from '@signozhq/ui/typography';
import { DataSource } from 'types/common/queryBuilder';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';

import styles from './MeterLoading.module.scss';

export default function MeterLoading(): JSX.Element {
	return (
		<div className={styles.loadingMeter}>
			<div className={styles.loadingMeterContent}>
				<img className={styles.loadingGif} src={loadingPlaneUrl} alt="wait-icon" />
				<Typography>Retrieving your {DataSource.METRICS}</Typography>
			</div>
		</div>
	);
}
