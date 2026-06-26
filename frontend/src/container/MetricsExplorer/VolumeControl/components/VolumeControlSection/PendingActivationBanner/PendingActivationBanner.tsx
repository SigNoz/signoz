import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './PendingActivationBanner.module.scss';

function PendingActivationBanner(): JSX.Element {
	return (
		<div className={styles.banner} data-testid="volume-control-pending-banner">
			<Info size={13} />
			<Typography.Text size="sm" color="muted">
				This metric&apos;s configuration was recently updated. Volume changes will
				take effect within a few minutes.
			</Typography.Text>
		</div>
	);
}

export default PendingActivationBanner;
