import { Trash2, X } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { MemberRow } from 'components/MembersTable/MembersTable';

interface DeleteMemberDialogProps {
	open: boolean;
	isInvited: boolean;
	member: MemberRow | null;
	isDeleting: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
}

function DeleteMemberDialog({
	open,
	isInvited,
	member,
	isDeleting,
	onClose,
	onConfirm,
}: DeleteMemberDialogProps): JSX.Element {
	const title = isInvited ? 'Revoke Invite' : 'Delete Member';

	const body = isInvited ? (
		<>
			Are you sure you want to revoke the invite for{' '}
			<strong>{member?.email}</strong>? They will no longer be able to join the
			workspace using this invite.
		</>
	) : (
		<>
			Are you sure you want to delete{' '}
			<strong>{member?.name || member?.email}</strong>? This will remove their
			access to the workspace.
		</>
	);

	return (
		<AlertDialog
			open={open}
			title={title}
			color="danger"
			confirmText={isDeleting ? 'Processing...' : title}
			confirmIcon={<Trash2 size={12} />}
			cancelIcon={<X size={12} />}
			onConfirm={onConfirm}
			onCancel={onClose}
			testId="member-delete"
		>
			{body}
		</AlertDialog>
	);
}

export default DeleteMemberDialog;
