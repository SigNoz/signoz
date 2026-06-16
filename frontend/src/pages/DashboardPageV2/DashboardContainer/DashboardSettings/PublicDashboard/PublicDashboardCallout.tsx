import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './PublicDashboard.module.scss';

function PublicDashboardCallout(): JSX.Element {
	return (
		<div className={styles.callout}>
			<Info size={12} className={styles.calloutIcon} />
			<Typography.Text className={styles.calloutText}>
				Dashboard variables won&apos;t work in public dashboards
			</Typography.Text>
		</div>
	);
}

export default PublicDashboardCallout;
