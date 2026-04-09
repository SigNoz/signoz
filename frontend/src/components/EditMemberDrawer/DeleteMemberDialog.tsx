import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';
import { MemberRow } from 'components/MembersTable/MembersTable';

interface DeleteMemberDialogProps {
	open: boolean;
	isInvited: boolean;
	member: MemberRow | null;
	isDeleting: boolean;
	onClose: () => void;
	onConfirm: () => void;
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
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={title}
			width="narrow"
			className="alert-dialog delete-dialog"
			showCloseButton={false}
			disableOutsideClick={false}
		>
			<p className="delete-dialog__body">{body}</p>

			<DialogFooter className="delete-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={onClose}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					disabled={isDeleting}
					onClick={onConfirm}
				>
					<Trash2 size={12} />
					{isDeleting ? 'Processing...' : title}
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default DeleteMemberDialog;
