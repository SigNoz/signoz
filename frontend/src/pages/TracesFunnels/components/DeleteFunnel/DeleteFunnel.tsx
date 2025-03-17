import '../RenameFunnel/RenameFunnel.styles.scss';
import './DeleteFunnel.styles.scss';

import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useDeleteFunnel } from 'hooks/TracesFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { Trash2, X } from 'lucide-react';
import { useQueryClient } from 'react-query';

interface DeleteFunnelProps {
	isOpen: boolean;
	onClose: () => void;
	funnelId: string;
}

function DeleteFunnel({
	isOpen,
	onClose,
	funnelId,
}: DeleteFunnelProps): JSX.Element {
	const deleteFunnelMutation = useDeleteFunnel();
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();

	const handleDelete = (): void => {
		deleteFunnelMutation.mutate(
			{
				id: funnelId,
			},
			{
				onSuccess: () => {
					notifications.success({
						message: 'Funnel deleted successfully',
					});
					onClose();
					queryClient.invalidateQueries([REACT_QUERY_KEY.GET_FUNNELS_LIST]);
				},
				onError: () => {
					notifications.error({
						message: 'Failed to delete funnel',
					});
				},
			},
		);
	};

	const handleCancel = (): void => {
		onClose();
	};

	return (
		<SignozModal
			open={isOpen}
			title="Delete this funnel"
			width={390}
			onCancel={handleCancel}
			rootClassName="funnel-modal delete-funnel-modal"
			cancelText="Cancel"
			okText="Delete Funnel"
			okButtonProps={{
				icon: <Trash2 size={14} />,
				loading: deleteFunnelMutation.isLoading,
				type: 'primary',
				className: 'funnel-modal__ok-btn',
				onClick: handleDelete,
			}}
			cancelButtonProps={{
				icon: <X size={14} />,
				type: 'text',
				className: 'funnel-modal__cancel-btn',
				onClick: handleCancel,
			}}
			getContainer={false}
		>
			<div className="delete-funnel-modal-content">
				Deleting the funnel would stop further analytics using this funnel. This is
				irreversible and cannot be undone.
			</div>
		</SignozModal>
	);
}

export default DeleteFunnel;
