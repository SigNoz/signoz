import { Check, Trash2, X } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Typography } from '@signozhq/ui/typography';

import { DeleteSavedViewDialogProps } from './types';

function DeleteSavedViewDialog({
	onCancel,
	onConfirm,
}: DeleteSavedViewDialogProps): JSX.Element {
	return (
		<AlertDialog
			open
			title="Delete this view"
			titleIcon={<Trash2 size={16} />}
			color="danger"
			confirmText="Delete view"
			confirmIcon={<Check size={12} />}
			cancelIcon={<X size={12} />}
			onConfirm={onConfirm}
			onCancel={onCancel}
			testId="delete-saved-view"
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				Deleting this view is irreversible and cannot be undone.
			</Typography>
		</AlertDialog>
	);
}

export default DeleteSavedViewDialog;
