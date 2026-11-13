import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Trash2, X } from '@signozhq/icons';

interface DiscardChangesDialogProps {
	open: boolean;
	onConfirm: () => Promise<void> | void;
	onCancel: () => void;
}

function DiscardChangesDialog({
	open,
	onConfirm,
	onCancel,
}: DiscardChangesDialogProps): JSX.Element {
	return (
		<AlertDialog
			open={open}
			title="Discard unsaved changes?"
			titleIcon={<Trash2 size={16} />}
			color="danger"
			confirmText="Discard changes"
			confirmIcon={<Trash2 size={12} />}
			onConfirm={onConfirm}
			cancelText="Keep editing"
			cancelIcon={<X size={12} />}
			onCancel={onCancel}
			testId="discard-changes-dialog"
		>
			This reverts every unsaved group and mapping change back to the last saved
			state. This action cannot be undone.
		</AlertDialog>
	);
}

export default DiscardChangesDialog;
