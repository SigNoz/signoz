import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Trash2, X } from '@signozhq/icons';

interface DeleteConfirmDialogProps {
	open: boolean;
	modelName: string;
	onConfirm: () => Promise<void> | void;
	onCancel: () => void;
}

// Confirmation step before deleting a model cost — deletion is irreversible, so
// the destructive action is gated behind an explicit confirm. AlertDialog blocks
// outside-click dismissal and hides the close button to force an explicit choice,
// and shows the confirm button as loading while the onConfirm promise is pending.
function DeleteConfirmDialog({
	open,
	modelName,
	onConfirm,
	onCancel,
}: DeleteConfirmDialogProps): JSX.Element {
	return (
		<AlertDialog
			open={open}
			title="Delete Model Cost Data "
			titleIcon={<Trash2 size={16} />}
			color="danger"
			confirmText="Delete"
			confirmIcon={<Trash2 size={12} />}
			onConfirm={onConfirm}
			cancelIcon={<X size={12} />}
			onCancel={onCancel}
			testId="drawer-delete-dialog"
		>
			Are you sure you want to delete <strong>{modelName}</strong>? Once deleted,
			this action cannot be undone.
		</AlertDialog>
	);
}

export default DeleteConfirmDialog;
