import { useTranslation } from 'react-i18next';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import FormAlertChannels from 'container/FormAlertChannels';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import { useChannelFormState } from './useChannelFormState';
import styles from './ChannelForm.module.scss';

interface ChannelFormProps {
	/** Absent when creating. */
	channelId?: string;
	onDone: () => void;
}

function ChannelForm({ channelId, onDone }: ChannelFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		formInstance,
		type,
		values,
		setValues,
		onTypeChange,
		onSave,
		onTest,
		isSaving,
		isTesting,
		isLoading,
		loadError,
	} = useChannelFormState({ channelId, onDone });

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

	// A channel written through the v1 API can carry a configuration this API
	// does not model, several notifier configs on one channel for instance.
	if (loadError) {
		return (
			<Callout
				type="error"
				showIcon
				title={loadError}
				className={styles.loadError}
				testId="channel-load-error"
			>
				This channel carries a configuration this form cannot represent, because it
				was written through the v1 API. Recreate it here, or keep editing it through
				that API.
			</Callout>
		);
	}

	if (isLoading) {
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
			<FormAlertChannels
				formInstance={formInstance}
				type={type}
				setSelectedConfig={setValues}
				onTypeChangeHandler={onTypeChange}
				onTestHandler={onTest}
				onSaveHandler={onSave}
				savingState={isSaving}
				testingState={isTesting}
				title={
					// eslint-disable-next-line no-nested-ternary
					channelId
						? readOnly
							? t('page_title_view')
							: t('page_title_edit')
						: t('page_title_create')
				}
				initialValue={{ type, ...values }}
				editing={!!channelId}
				readOnly={readOnly}
				saveChecks={saveChecks}
				testChecks={[NotificationChannelCreatePermission]}
			/>
		</>
	);
}

export default ChannelForm;
