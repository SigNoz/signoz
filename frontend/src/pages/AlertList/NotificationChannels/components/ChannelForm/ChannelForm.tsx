import { useTranslation } from 'react-i18next';
import { SolidAlertCircle } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import Spinner from 'components/Spinner';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import ChannelFormBody from './ChannelFormBody';
import styles from './ChannelForm.module.scss';
import { ChannelKind } from 'container/CreateAlertChannels/types';

import { useChannelDraft } from './useChannelDraft';

interface ChannelFormProps {
	channelId?: string;
	/** Preselects the type when creating, so a filtered list can offer its kind. */
	initialKind?: ChannelKind;
	onDone: () => void;
}

function ChannelForm({
	channelId,
	initialKind,
	onDone,
}: ChannelFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	const { draft, isLoading, loadError } = useChannelDraft(
		channelId,
		initialKind,
	);

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
			<div className={styles.loadError}>
				<Callout
					color="danger"
					size="sm"
					icon={<SolidAlertCircle />}
					testId="channel-load-error"
				>
					{t('channel_load_failed')}. {loadError}
				</Callout>
			</div>
		);
	}

	if (isLoading || !draft) {
		return <Spinner tip={t('loading_channels_message')} />;
	}

	return (
		<ChannelFormBody
			draft={draft}
			target={channelId ? { mode: 'edit', channelId } : { mode: 'create' }}
			onDone={onDone}
			readOnly={readOnly}
			saveChecks={saveChecks}
			testChecks={[NotificationChannelCreatePermission]}
		/>
	);
}

export default ChannelForm;
