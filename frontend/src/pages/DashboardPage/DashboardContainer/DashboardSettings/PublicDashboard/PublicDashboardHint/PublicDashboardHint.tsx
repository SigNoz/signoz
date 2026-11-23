import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './PublicDashboardHint.module.scss';

function PublicDashboardHint(): JSX.Element {
	return (
		<div className={styles.hint}>
			<Info size={14} className={styles.hintIcon} />
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="tertiary"
				as="span"
				textOverflow="wrap"
			>
				Dashboard variables aren&apos;t supported on public links.
			</Typography>
		</div>
	);
}

export default PublicDashboardHint;
