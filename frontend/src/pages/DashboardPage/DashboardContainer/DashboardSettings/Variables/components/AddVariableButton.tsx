import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import DisabledControlTooltip from '../../../components/DisabledControlTooltip/DisabledControlTooltip';

/**
 * `disabledReason` is the only input: a non-empty reason both disables the button
 * and explains it, so there is no way to disable it silently.
 */
const AddVariableButton = ({
	disabledReason = '',
	setIsEditing,
}: {
	disabledReason?: string;
	setIsEditing: (state: { type: 'new' }) => void;
}): JSX.Element => (
	<DisabledControlTooltip reason={disabledReason}>
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
	</DisabledControlTooltip>
);

export default AddVariableButton;
