import FormAlertChannels from 'container/FormAlertChannels';
import { ChannelFormState } from 'container/CreateAlertChannels/channelFormValues';

import { ChannelFormTarget, useChannelFormState } from './useChannelFormState';

interface ChannelFormBodyProps {
	draft: ChannelFormState;
	target: ChannelFormTarget;
	onDone: () => void;
	/** The reader has `read` but not `update`, so the form shows without saving. */
	readOnly: boolean;
}

function ChannelFormBody({
	draft,
	target,
	onDone,
	readOnly,
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
		/>
	);
}

export default ChannelFormBody;
