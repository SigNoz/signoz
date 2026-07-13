import { Gauge } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './VolumeControlHeader.module.scss';

function VolumeControlHeader(): JSX.Element {
	return (
		<div className={styles.header}>
			<div className={styles.titleRow}>
				<Gauge size={18} />
				<Typography.Title level={4} className={styles.title}>
					Volume Control
				</Typography.Title>
			</div>
			<Typography.Text size="small" color="muted" className={styles.subtitle}>
				Aggregate away high-cardinality attributes to reduce stored metric volume
				and cost.
			</Typography.Text>
		</div>
	);
}

export default VolumeControlHeader;
