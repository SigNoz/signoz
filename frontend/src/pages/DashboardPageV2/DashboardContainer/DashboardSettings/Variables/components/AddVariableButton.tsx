import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import DisabledControlTooltip from '../../../components/DisabledControlTooltip/DisabledControlTooltip';

const AddVariableButton = ({
	isEditable,
	disabledReason = '',
	setIsEditing,
}: {
	isEditable: boolean;
	/** Lock or missing-permission reason; shown on the disabled button. */
	disabledReason?: string;
	setIsEditing: (state: { type: 'new' }) => void;
}): JSX.Element => {
	return (
		<DisabledControlTooltip reason={disabledReason} disabled={!isEditable}>
			<Button
				variant="solid"
				color="primary"
				prefix={<Plus size={14} />}
				size="md"
				onClick={(): void => setIsEditing({ type: 'new' })}
				testId="add-variable"
				disabled={!isEditable}
			>
				Add variable
			</Button>
		</DisabledControlTooltip>
	);
};

export default AddVariableButton;
