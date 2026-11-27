import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import ROUTES from 'constants/routes';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { openInNewTab } from 'utils/navigation';

import styles from './NotificationChannelsNotFound.module.scss';

const CREATE_CHECKS = [NotificationChannelCreatePermission];

interface NotificationChannelsNotFoundProps {
	onRefresh: () => void;
}

/**
 * The empty state of a channel picker. Offers to create a channel to whoever
 * may; a failed check offers it too, and the channel page decides.
 */
function NotificationChannelsNotFound({
	onRefresh,
}: NotificationChannelsNotFoundProps): JSX.Element {
	const { isGranted, isLoading, error } = useAuthZ(CREATE_CHECKS);
	const canCreate = !!error || isGranted(NotificationChannelCreatePermission);

	return (
		<div className={styles.container}>
			<div className={styles.message}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					No channels yet.
				</Typography>
				{!isLoading &&
					(canCreate ? (
						<Button
							variant="link"
							color="primary"
							size="sm"
							testId="channels-not-found-create"
							onClick={(): void => openInNewTab(ROUTES.CHANNELS_NEW)}
						>
							Create one here.
						</Button>
					) : (
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Please ask your admin to create one.
						</Typography>
					))}
			</div>
			<Button
				variant="link"
				color="secondary"
				size="sm"
				testId="channels-not-found-refresh"
				onClick={onRefresh}
			>
				Refresh
			</Button>
		</div>
	);
}

export default NotificationChannelsNotFound;
