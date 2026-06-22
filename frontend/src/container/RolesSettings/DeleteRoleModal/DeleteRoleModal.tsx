import { Trash2 } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
import styles from './DeleteRoleModal.module.scss';

interface DeleteRoleModalProps {
	isOpen: boolean;
	roleName: string;
	errorMessage: string | null;
	onCancel: () => void;
	onConfirm: () => Promise<boolean>;
}

function DeleteRoleModal({
	isOpen,
	roleName,
	errorMessage,
	onCancel,
	onConfirm,
}: DeleteRoleModalProps): JSX.Element {
	return (
		<ConfirmDialog
			open={isOpen}
			onOpenChange={(next): void => {
				if (!next) {
					onCancel();
				}
			}}
			title="Delete Role"
			titleIcon={<Trash2 size={14} />}
			confirmText="Delete Role"
			confirmColor="destructive"
			cancelText="Cancel"
			onConfirm={onConfirm}
			onCancel={onCancel}
			disableOutsideClick
		>
			<Typography>
				Are you sure you want to delete the role <strong>{roleName}</strong>? This
				action cannot be undone.
			</Typography>
			{errorMessage && (
				<>
					<Callout title="Error" color="cherry" className={styles.errorCallout}>
						{errorMessage}
					</Callout>
				</>
			)}
		</ConfirmDialog>
	);
}

export default DeleteRoleModal;
