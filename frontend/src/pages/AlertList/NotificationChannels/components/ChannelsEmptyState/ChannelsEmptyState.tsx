import { Bell, Plus } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import styles from './ChannelsEmptyState.module.scss';

const CREATE_CHECKS = [NotificationChannelCreatePermission];
const DOCS_URL = 'https://signoz.io/docs/setup-alerts-notification/';

interface ChannelsEmptyStateProps {
	onCreate: () => void;
}

function ChannelsEmptyState({
	onCreate,
}: ChannelsEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="channels-empty-state">
			<Bell className={styles.icon} size={16} />
			<Typography.Text className={styles.title}>
				No notification channels yet
			</Typography.Text>
			<Typography.Text className={styles.subtitle}>
				A channel is where an alert ends up. Create one and your alert rules and
				routing policies can point at it.
			</Typography.Text>
			<div className={styles.actions}>
				<AuthZButton
					checks={CREATE_CHECKS}
					variant="solid"
					color="primary"
					size="md"
					prefix={<Plus size={14} />}
					onClick={onCreate}
					testId="channels-empty-create"
				>
					New channel
				</AuthZButton>
			</div>
			<a
				className={styles.docsLink}
				href={DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
				data-testid="channels-empty-docs"
			>
				Read the setup guide
			</a>
		</div>
	);
}

export default ChannelsEmptyState;
