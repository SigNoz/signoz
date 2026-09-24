import { useTranslation } from 'react-i18next';
import { Callout } from '@signozhq/ui/callout';
import Spinner from 'components/Spinner';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

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
	// While the check is in flight the answer is unknown, so the form stays
	// editable rather than flashing read-only; the API is the real gate.
	const {
		canEdit,
		isLoading: isPermissionLoading,
		editChecks,
	} = useNotificationChannelPermissions(channelId ?? '', {
		enabled: !!channelId,
	});
	const readOnly = !!channelId && !isPermissionLoading && !canEdit;
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
