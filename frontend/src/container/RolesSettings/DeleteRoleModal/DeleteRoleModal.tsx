import { SolidAlertCircle, Trash2 } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Typography } from '@signozhq/ui/typography';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import APIError from 'types/api/error';
import styles from './DeleteRoleModal.module.scss';
import { Callout } from '@signozhq/ui/callout';

interface DeleteRoleModalProps {
	isOpen: boolean;
	roleName: string;
	error: APIError | null;
	onCancel: () => void;
	onConfirm: () => Promise<void>;
}

function DeleteRoleModal({
	isOpen,
	roleName,
	error,
	onCancel,
	onConfirm,
}: DeleteRoleModalProps): JSX.Element {
	return (
		<AlertDialog
			open={isOpen}
			title="Delete Role"
			titleIcon={<Trash2 size={14} />}
			confirmText="Delete Role"
			color="danger"
			cancelText="Cancel"
			onConfirm={onConfirm}
			onCancel={onCancel}
			testId="delete-role-modal"
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				Are you sure you want to delete the role <strong>{roleName}</strong>? This
				action cannot be undone.
			</Typography>
			{error && (
				<div className={styles.errorCallout}>
					<Callout color="danger" size="sm" icon={<SolidAlertCircle />}>
						Failed to delete role
						<ErrorInPlace error={error} height="auto" padding={0} />
					</Callout>
				</div>
			)}
		</AlertDialog>
	);
}

export default DeleteRoleModal;
