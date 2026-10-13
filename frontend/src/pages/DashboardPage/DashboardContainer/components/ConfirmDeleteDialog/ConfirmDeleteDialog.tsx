import { ReactNode } from 'react';
import { Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';

import styles from './ConfirmDeleteDialog.module.scss';

interface ConfirmDeleteDialogProps {
	open: boolean;
	title: string;
	description: ReactNode;
	confirmLabel?: string;
	isLoading?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

/**
 * Shared destructive-confirm dialog built on @signozhq/ui DialogWrapper (not
 * antd Modal), so it inherits the design-system styling/theme. Used by the
 * dashboard and section delete flows.
 */
function ConfirmDeleteDialog({
	open,
	title,
	description,
	confirmLabel = 'Delete',
	isLoading = false,
	onConfirm,
	onClose,
}: ConfirmDeleteDialogProps): JSX.Element {
	const footer = (
		<div className={styles.footer}>
			<Button variant="solid" color="secondary" onClick={onClose}>
				<X size={12} />
				Cancel
			</Button>
			<Button
				variant="solid"
				color="destructive"
				loading={isLoading}
				onClick={onConfirm}
				testId="confirm-delete"
			>
				<Trash2 size={12} />
				{confirmLabel}
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={title}
			width="narrow"
			showCloseButton={false}
			footer={footer}
		>
			<div className={styles.body}>{description}</div>
		</DialogWrapper>
	);
}

export default ConfirmDeleteDialog;
