import { useTranslation } from 'react-i18next';
import { Callout } from '@signozhq/ui/callout';
import Spinner from 'components/Spinner';
import FormAlertChannels from 'container/FormAlertChannels';
import { useNotificationChannelPermissions } from 'hooks/notificationChannels/useNotificationChannelPermissions';

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
	// While the check is in flight the answer is unknown, so the form stays
	// editable rather than flashing read-only; the API is the real gate.
	const { canEdit, isLoading: isPermissionLoading } =
		useNotificationChannelPermissions(channelId ?? '', {
			enabled: !!channelId,
		});
	const readOnly = !!channelId && !isPermissionLoading && !canEdit;

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
		/>
	);
}

export default ChannelForm;
