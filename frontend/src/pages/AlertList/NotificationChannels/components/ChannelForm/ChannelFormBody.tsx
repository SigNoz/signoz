import FormAlertChannels from 'container/FormAlertChannels';
import { ChannelFormState } from 'container/CreateAlertChannels/channelFormValues';

import { ChannelFormTarget, useChannelFormState } from './useChannelFormState';

interface ChannelFormBodyProps {
	draft: ChannelFormState;
	target: ChannelFormTarget;
	onDone: () => void;
}

function ChannelFormBody({
	draft,
	target,
	onDone,
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
		/>
	);
}

export default ChannelFormBody;
