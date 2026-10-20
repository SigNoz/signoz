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
	const { form, type, onTypeChange, onSave, onTest, isSaving, isTesting } =
		useChannelFormState({ draft, target, onDone });

	return (
		<FormAlertChannels
			form={form}
			type={type}
			onTypeChangeHandler={onTypeChange}
			onTestHandler={onTest}
			onSaveHandler={onSave}
			savingState={isSaving}
			testingState={isTesting}
			editing={target.mode === 'edit'}
			readOnly={readOnly}
			saveChecks={saveChecks}
			testChecks={testChecks}
		/>
	);
}

export default ChannelFormBody;
