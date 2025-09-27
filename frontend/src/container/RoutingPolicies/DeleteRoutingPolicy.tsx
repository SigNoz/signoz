import { Button, Modal, Typography } from 'antd';
import { Trash2, X } from 'lucide-react';

import { DeleteRoutingPolicyProps } from './types';

function DeleteRoutingPolicy({
	handleClose,
	handleDelete,
	routingPolicy,
	isDeletingRoutingPolicy,
}: DeleteRoutingPolicyProps): JSX.Element {
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
					icon={<Trash2 size={16} />}
					onClick={handleDelete}
					className="delete-btn"
					disabled={isDeletingRoutingPolicy}
				>
					Delete Routing Policy
				</Button>,
			]}
		>
			<Typography.Text className="delete-text">
				{`Are you sure you want to delete ${routingPolicy?.name} routing policy? Deleting a routing policy is irreversible and cannot be undone.`}
			</Typography.Text>
		</Modal>
	);
}

export default DeleteRoutingPolicy;
