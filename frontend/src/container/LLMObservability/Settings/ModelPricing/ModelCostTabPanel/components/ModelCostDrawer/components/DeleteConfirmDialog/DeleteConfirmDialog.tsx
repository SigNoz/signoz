import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Trash2, X } from '@signozhq/icons';
import cx from 'classnames';

import styles from './DeleteConfirmDialog.module.scss';
import { Typography } from 'container/GridCardLayout/WidgetHeader/styles';

interface DeleteConfirmDialogProps {
	open: boolean;
	modelName: string;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Confirmation step before deleting a model cost — deletion is irreversible, so
// the destructive action is gated behind an explicit confirm.
function DeleteConfirmDialog({
	open,
	modelName,
	isDeleting,
	onConfirm,
	onCancel,
}: DeleteConfirmDialogProps): JSX.Element {
	const footer = (
		<div className={styles.footer}>
			<Button
				variant="solid"
				color="secondary"
				onClick={onCancel}
				prefix={<X size={12} />}
				testId="drawer-delete-cancel-btn"
			>
				Cancel
			</Button>
			<Button
				variant="solid"
				color="destructive"
				loading={isDeleting}
				onClick={onConfirm}
				prefix={<Trash2 size={12} />}
				testId="drawer-delete-confirm-btn"
			>
				Delete
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			title={`Delete Model Cost Data?`}
			width="narrow"
			className={cx('alert-dialog', styles.dialog)}
			showCloseButton={false}
			footer={footer}
		>
			<div>
				<Typography.Text size="base" color="muted">
					{' '}
					Are you sure you want to delete <strong>{modelName}</strong> ? once
					deleted, this action cannot be undone.
				</Typography.Text>
			</div>
		</DialogWrapper>
	);
}

export default DeleteConfirmDialog;
