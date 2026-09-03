import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

const AddVariableButton = ({
	isEditable,
	setIsEditing,
}: {
	isEditable: boolean;
	setIsEditing: (state: { type: 'new' }) => void;
}): JSX.Element => {
	return (
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
	);
};

export default AddVariableButton;
