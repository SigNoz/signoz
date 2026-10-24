import { useTranslation } from 'react-i18next';
import { Typography } from '@signozhq/ui/typography';
import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import FormAlertChannels from 'container/FormAlertChannels';
import { ChannelFormState } from 'container/CreateAlertChannels/channelFormValues';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { ChannelFormTarget, useChannelFormState } from './useChannelFormState';

interface ChannelFormBodyProps {
	draft: ChannelFormState;
	target: ChannelFormTarget;
	onDone: () => void;
	/** The reader has `read` but not `update`, so the fields render disabled. */
	readOnly: boolean;
	/** Gates saving; a denial disables the button and names the missing scope. */
	saveChecks: BrandedPermission[];
	/** Gates a test send, which the API allows with `create`. */
	testChecks: BrandedPermission[];
}

function ChannelFormBody({
	draft,
	target,
	onDone,
	readOnly,
	saveChecks,
	testChecks,
}: ChannelFormBodyProps): JSX.Element {
	const { t } = useTranslation('channels');
	const { contextHolder, confirmDelete } = useDeleteConfirm();
	const {
		form,
		type,
		isDirty,
		onTypeChange,
		onSave,
		onTest,
		isSaving,
		isTesting,
	} = useChannelFormState({ draft, target, onDone });

	const onDiscard = (): void => {
		if (!isDirty) {
			onDone();
			return;
		}

		confirmDelete({
			title: (
				<Typography.Title level={5}>{t('discard_changes_title')}</Typography.Title>
			),
			content: t('discard_changes_body'),
			confirmText: t('button_discard_confirm'),
			onConfirm: onDone,
		});
	};

	return (
		<>
			<FormAlertChannels
				form={form}
				type={type}
				onTypeChangeHandler={onTypeChange}
				onTestHandler={onTest}
				onSaveHandler={onSave}
				onDiscardHandler={onDiscard}
				savingState={isSaving}
				testingState={isTesting}
				editing={target.mode === 'edit'}
				readOnly={readOnly}
				hasChanges={isDirty}
				saveChecks={saveChecks}
				testChecks={testChecks}
			/>
			{contextHolder}
		</>
	);
}

export default ChannelFormBody;
