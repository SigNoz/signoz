import { Trash2, X } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';
import { Button } from '@signozhq/ui/button';

interface DeleteChannelDialogProps {
	open: boolean;
	channelName: string;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Alert rules and routing policies reference a channel by name, so a delete can
// silence them. The destructive step stays behind an explicit confirm.
function DeleteChannelDialog({
	open,
	channelName,
	isDeleting,
	onConfirm,
	onCancel,
}: DeleteChannelDialogProps): JSX.Element {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			width="narrow"
			title="Delete notification channel"
			titleIcon={<Trash2 size={16} />}
			footer={
				<>
					<Button
						variant="solid"
						color="secondary"
						onClick={onCancel}
						prefix={<X size={12} />}
						testId="channel-delete-cancel"
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="destructive"
						loading={isDeleting}
						onClick={onConfirm}
						prefix={<Trash2 size={12} />}
						testId="channel-delete-confirm"
					>
						Delete
					</Button>
				</>
			}
		>
			Are you sure you want to delete <strong>{channelName}</strong>? Alerts routed
			to it will stop being delivered, and this cannot be undone.
		</AlertDialog>
	);
}

export default DeleteChannelDialog;
