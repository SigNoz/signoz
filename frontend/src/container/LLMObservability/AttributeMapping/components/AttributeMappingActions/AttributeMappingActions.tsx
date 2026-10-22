import { Button } from '@signozhq/ui/button';

import { useCanManageAttributeMapping } from '../../hooks/useCanManageAttributeMapping';
import styles from './AttributeMappingActions.module.scss';

interface AttributeMappingActionsProps {
	isDirty: boolean;
	isSaving: boolean;
	onDiscard: () => void;
	onSave: () => void;
}

function AttributeMappingActions({
	isDirty,
	isSaving,
	onDiscard,
	onSave,
}: AttributeMappingActionsProps): JSX.Element | null {
	const canManage = useCanManageAttributeMapping();

	if (!canManage || !isDirty) {
		return null;
	}

	return (
		<div className={styles.actions}>
			<span className={styles.unsavedChanges} data-testid="unsaved-changes">
				Unsaved changes
			</span>
			<Button
				size="md"
				variant="outlined"
				color="secondary"
				onClick={onDiscard}
				disabled={isSaving}
				disabledTooltip="Wait for the save to finish"
				testId="discard-changes-btn"
			>
				Discard
			</Button>
			<Button
				size="md"
				variant="solid"
				color="primary"
				onClick={onSave}
				loading={isSaving}
				testId="save-changes-btn"
			>
				{isSaving ? 'Saving…' : 'Save changes'}
			</Button>
		</div>
	);
}

export default AttributeMappingActions;
