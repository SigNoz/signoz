import { useTranslation } from 'react-i18next';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import ChannelFormBody from './ChannelFormBody';
import styles from './ChannelForm.module.scss';
import { useChannelDraft } from './useChannelDraft';

interface ChannelFormProps {
	channelId?: string;
	onDone: () => void;
}

function ChannelForm({ channelId, onDone }: ChannelFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	const { draft, isLoading, loadError } = useChannelDraft(channelId);

	// A reader with `read` but no `update` still gets the screen, without saving.
	// Only a resolved denial locks it: while the check is in flight, or when it
	// failed outright, the form stays editable and the API is the real gate.
	const {
		canEdit,
		isLoading: isPermissionLoading,
		hasError: permissionCheckFailed,
		editChecks,
	} = useNotificationChannelPermissions(channelId ?? '', {
		enabled: !!channelId,
	});
	const readOnly =
		!!channelId && !isPermissionLoading && !permissionCheckFailed && !canEdit;
	// Saving an existing channel needs read and update on it; creating one needs
	// create on the collection, which is also what a test send is gated on.
	const saveChecks = channelId
		? editChecks
		: [NotificationChannelCreatePermission];

	if (loadError) {
		return (
			<Callout
				type="error"
				showIcon
				title={t('channel_load_failed')}
				className={styles.loadError}
				testId="channel-load-error"
			>
				{loadError}
			</Callout>
		);
	}

	if (isLoading || !draft) {
		return <Spinner tip={t('loading_channels_message')} />;
	}

	return (
		<>
			{/* a role is scoped to this channel by its id, so the id stays visible
			    and copyable even without `update` */}
			{!!channelId && (
				<div className={styles.selectorRow} data-testid="channel-id-selector">
					<Typography.Text color="muted" size="small">
						{t('field_channel_id')}
					</Typography.Text>
					<Typography.Text size="small">{channelId}</Typography.Text>
					<CopyButton
						value={channelId}
						ariaLabel={t('copy_channel_id')}
						testId="copy-channel-id"
					/>
				</div>
			)}
			{readOnly && (
				<Callout
					type="info"
					showIcon
					title={t('channel_read_only_title')}
					className={styles.readOnlyNotice}
					testId="channel-read-only-notice"
				>
					{t('channel_read_only_help')}
				</Callout>
			)}
			<ChannelFormBody
				draft={draft}
				target={channelId ? { mode: 'edit', channelId } : { mode: 'create' }}
				onDone={onDone}
				readOnly={readOnly}
				saveChecks={saveChecks}
				testChecks={[NotificationChannelCreatePermission]}
			/>
		</>
	);
}

export default ChannelForm;
