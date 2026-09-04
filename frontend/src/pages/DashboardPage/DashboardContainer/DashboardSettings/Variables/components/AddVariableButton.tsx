import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

/**
 * `disabledReason` is the only input: a non-empty reason both disables the button
 * and explains it, so there is no way to disable it silently.
 */
const AddVariableButton = ({
	disabledReason = '',
	disabledKind,
	setIsEditing,
}: {
	disabledReason?: string;
	disabledKind: 'denied' | 'blocked';
	setIsEditing: (state: { type: 'new' }) => void;
}): JSX.Element => (
	<DisabledReasonTooltip reason={disabledReason} kind={disabledKind}>
		<Button
			variant="solid"
			color="primary"
			prefix={<Plus size={14} />}
			size="md"
			onClick={(): void => setIsEditing({ type: 'new' })}
			testId="add-variable"
			disabled={!!disabledReason}
		>
			Add variable
		</Button>
	</DisabledReasonTooltip>
);

export default AddVariableButton;
