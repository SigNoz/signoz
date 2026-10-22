import { Plus } from '@signozhq/icons';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

const AddVariableButton = ({
	checks,
	disabledTooltip,
	setIsEditing,
}: {
	checks: BrandedPermission[];
	disabledTooltip?: string;
	setIsEditing: (state: { type: 'new' }) => void;
}): JSX.Element => (
	<AuthZButton
		checks={checks}
		disabledTooltip={disabledTooltip}
		variant="solid"
		color="primary"
		prefix={<Plus size={14} />}
		size="md"
		onClick={(): void => setIsEditing({ type: 'new' })}
		testId="add-variable"
	>
		Add variable
	</AuthZButton>
);

export default AddVariableButton;
