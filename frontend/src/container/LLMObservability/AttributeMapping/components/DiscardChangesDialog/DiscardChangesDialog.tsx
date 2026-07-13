import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Button } from '@signozhq/ui/button';
import { Trash2, X } from '@signozhq/icons';

interface DiscardChangesDialogProps {
	open: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Confirmation before discarding staged attribute-mapping edits. Discard throws
// away every unsaved group/mapper change in the working copy and can't be
// undone, so it's gated behind an explicit confirm. AlertDialog blocks
// outside-click dismissal to force a deliberate choice.
function DiscardChangesDialog({
	open,
	onConfirm,
	onCancel,
}: DiscardChangesDialogProps): JSX.Element {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			width="narrow"
			title="Discard unsaved changes?"
			titleIcon={<Trash2 size={16} />}
			footer={
				<>
					<Button
						variant="solid"
						color="secondary"
						onClick={onCancel}
						prefix={<X size={12} />}
						testId="discard-changes-cancel-btn"
					>
						Keep editing
					</Button>
					<Button
						variant="solid"
						color="destructive"
						onClick={onConfirm}
						prefix={<Trash2 size={12} />}
						testId="discard-changes-confirm-btn"
					>
						Discard changes
					</Button>
				</>
			}
		>
			This reverts every unsaved group and mapping change back to the last saved
			state. This action cannot be undone.
		</AlertDialog>
	);
}

export default DiscardChangesDialog;
