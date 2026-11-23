import { Gauge } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './VolumeControlHeader.module.scss';

function VolumeControlHeader(): JSX.Element {
	return (
		<div className={styles.header}>
			<div className={styles.titleRow}>
				<Gauge size={18} />
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="inherit"
					as="h4"
					textOverflow="wrap"
				>
					Volume Control
				</Typography>
			</div>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="span"
				display="inline-block"
				maxWidth={680}
				textOverflow="wrap"
			>
				Aggregate away high-cardinality attributes to reduce stored metric volume
				and cost.
			</Typography>
		</div>
	);
}

export default VolumeControlHeader;
