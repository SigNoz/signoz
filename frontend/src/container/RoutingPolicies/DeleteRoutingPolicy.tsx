import { Button, Modal, Typography } from 'antd';
import { Loader, Trash2, X } from 'lucide-react';

import { DeleteRoutingPolicyProps } from './types';

function DeleteRoutingPolicy({
	handleClose,
	handleDelete,
	routingPolicy,
	isDeletingRoutingPolicy,
}: DeleteRoutingPolicyProps): JSX.Element {
	const deleteButtonIcon = isDeletingRoutingPolicy ? (
		<Loader size={16} />
	) : (
		<Trash2 size={16} />
	);

	return (
		<Modal
			className="delete-policy-modal"
			title={<span className="title">Delete Routing Policy</span>}
			open
			closable={false}
			onCancel={handleClose}
			footer={[
				<Button
					key="cancel"
					onClick={handleClose}
					className="cancel-btn"
					icon={<X size={16} />}
					disabled={isDeletingRoutingPolicy}
				>
					Cancel
				</Button>,
				<Button
					key="submit"
					type="primary"
					icon={deleteButtonIcon}
					onClick={handleDelete}
					className="delete-btn"
					disabled={isDeletingRoutingPolicy}
				>
					Delete Routing Policy
				</Button>,
			]}
		>
			<Typography.Text className="delete-text">
				Are you sure you want to delete <strong>{routingPolicy?.name}</strong>{' '}
				routing policy? Deleting a routing policy is irreversible and cannot be
				undone.
			</Typography.Text>
		</Modal>
	);
}

export default DeleteRoutingPolicy;
