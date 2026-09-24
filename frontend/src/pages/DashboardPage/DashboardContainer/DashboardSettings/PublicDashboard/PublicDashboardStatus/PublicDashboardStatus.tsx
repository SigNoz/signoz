import { Globe, LockKeyhole } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './PublicDashboardStatus.module.scss';

interface PublicDashboardStatusProps {
	isPublic: boolean;
}

function PublicDashboardStatus({
	isPublic,
}: PublicDashboardStatusProps): JSX.Element {
	return (
		<div
			className={cx(styles.statusStrip, { [styles.statusStripLive]: isPublic })}
		>
			<span
				className={cx(styles.statusMedallion, {
					[styles.statusMedallionLive]: isPublic,
				})}
			>
				{isPublic ? <Globe size={18} /> : <LockKeyhole size={18} />}
			</span>

			<div className={styles.statusBody}>
				<Typography.Text className={styles.statusTitle}>
					{isPublic ? 'This dashboard is live' : 'This dashboard is private'}
				</Typography.Text>
				<Typography.Text
					className={cx(styles.statusSubtitle, {
						[styles.statusSubtitleLive]: isPublic,
					})}
				>
					{isPublic
						? 'Anyone with the link can view it — no account needed.'
						: 'Publish it to share a read-only view with anyone who has the link.'}
				</Typography.Text>
			</div>

			<Badge variant="outline" color={isPublic ? 'robin' : 'secondary'}>
				<span className={styles.statusBadgeDot} />
				{isPublic ? 'Public' : 'Private'}
			</Badge>
		</div>
	);
}

export default PublicDashboardStatus;
