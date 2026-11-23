import { ReactNode } from 'react';
import { Trash2, X } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';

interface ConfirmDeleteDialogProps {
	open: boolean;
	title: string;
	description: ReactNode;
	confirmLabel?: string;
	onConfirm: () => void | Promise<void>;
	onClose: () => void;
}

/**
 * Shared destructive-confirm dialog built on @signozhq/ui AlertDialog (not
 * antd Modal), so it inherits the design-system styling/theme. Used by the
 * dashboard and section delete flows. `onConfirm` must close the dialog, and
 * may return a promise to show the confirm button as loading.
 */
function ConfirmDeleteDialog({
	open,
	title,
	description,
	confirmLabel = 'Delete',
	onConfirm,
	onClose,
}: ConfirmDeleteDialogProps): JSX.Element {
	return (
		<AlertDialog
			open={open}
			title={title}
			color="danger"
			confirmText={confirmLabel}
			confirmIcon={<Trash2 size={12} />}
			cancelIcon={<X size={12} />}
			onConfirm={onConfirm}
			onCancel={onClose}
			testId="confirm-delete"
		>
			{description}
		</AlertDialog>
	);
}

export default ConfirmDeleteDialog;
