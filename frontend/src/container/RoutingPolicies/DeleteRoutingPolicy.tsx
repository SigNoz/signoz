import { Modal } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Loader, Trash2, X } from '@signozhq/icons';

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
					disabled={isDeletingRoutingPolicy}
					variant="outlined"
					color="secondary"
					prefix={<X size={16} />}
				>
					Cancel
				</Button>,
				<Button
					key="submit"
					onClick={handleDelete}
					className="delete-btn"
					disabled={isDeletingRoutingPolicy}
					prefix={deleteButtonIcon}
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
