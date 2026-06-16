import { Typography } from '@signozhq/ui/typography';

import styles from './PublicDashboard.module.scss';

interface PublicDashboardStatusProps {
	isPublic: boolean;
}

function PublicDashboardStatus({
	isPublic,
}: PublicDashboardStatusProps): JSX.Element {
	return (
		<Typography.Text className={styles.statusTitle}>
			{isPublic
				? 'This dashboard is publicly accessible. Anyone with the link can view it.'
				: 'This dashboard is private. Publish it to make it accessible to anyone with the link.'}
		</Typography.Text>
	);
}

export default PublicDashboardStatus;
