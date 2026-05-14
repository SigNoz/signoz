import { Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Modal } from 'antd';

interface DeleteRoleModalProps {
	isOpen: boolean;
	roleName: string;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

function DeleteRoleModal({
	isOpen,
	roleName,
	isDeleting,
	onCancel,
	onConfirm,
}: DeleteRoleModalProps): JSX.Element {
	return (
		<Modal
			open={isOpen}
			onCancel={onCancel}
			title={<span className="title">Delete Role</span>}
			closable
			footer={[
				<Button
					key="cancel"
					className="cancel-btn"
					prefix={<X size={16} />}
					onClick={onCancel}
					size="sm"
					variant="solid"
					color="secondary"
				>
					Cancel
				</Button>,
				<Button
					key="delete"
					className="delete-btn"
					prefix={<Trash2 size={16} />}
					onClick={onConfirm}
					loading={isDeleting}
					size="sm"
					variant="solid"
					color="destructive"
				>
					Delete Role
				</Button>,
			]}
			destroyOnClose
			className="role-details-delete-modal"
		>
			<p className="delete-text">
				Are you sure you want to delete the role <strong>{roleName}</strong>? This
				action cannot be undone.
			</p>
		</Modal>
	);
}

export default DeleteRoleModal;
