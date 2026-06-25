import { Gauge } from '@signozhq/icons';
import { MetricreductionruletypesGettableReductionRuleDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './VolumeControlBadge.module.scss';

interface VolumeControlBadgeProps {
	rule?: MetricreductionruletypesGettableReductionRuleDTO;
}

function VolumeControlBadge({ rule }: VolumeControlBadgeProps): JSX.Element {
	if (!rule) {
		return (
			<span className={styles.none} data-testid="vc-badge-none">
				—
			</span>
		);
	}
	return (
		<span
			className={`${styles.badge} ${rule.active ? styles.active : styles.pending}`}
			data-testid="vc-badge-active"
		>
			<Gauge size={11} />
			{rule.active ? 'Active' : 'Pending'}
		</span>
	);
}

export default VolumeControlBadge;
