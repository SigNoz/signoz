import '../RenameFunnel/RenameFunnel.styles.scss';
import './DeleteFunnel.styles.scss';

import SignozModal from 'components/SignozModal/SignozModal';
import { LOCALSTORAGE } from 'constants/localStorage';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useDeleteFunnel } from 'hooks/TracesFunnels/useFunnels';
import { useLocalStorage } from 'hooks/useLocalStorage';
import { useNotifications } from 'hooks/useNotifications';
import { Trash2, X } from 'lucide-react';
import { useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';
import { FunnelStepData } from 'types/api/traceFunnels';

interface DeleteFunnelProps {
	isOpen: boolean;
	onClose: () => void;
	funnelId: string;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
}

function DeleteFunnel({
	isOpen,
	onClose,
	funnelId,
	shouldRedirectToTracesListOnDeleteSuccess,
}: DeleteFunnelProps): JSX.Element {
	const deleteFunnelMutation = useDeleteFunnel();
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();

	const history = useHistory();
	const { pathname } = history.location;

	// localStorage hook for funnel steps
	const localStorageKey = `${LOCALSTORAGE.FUNNEL_STEPS}_${funnelId}`;
	const [, , clearLocalStorageSavedSteps] = useLocalStorage<
		FunnelStepData[] | null
	>(localStorageKey, null);

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
					clearLocalStorageSavedSteps();
					onClose();

					if (
						pathname !== ROUTES.TRACES_FUNNELS &&
						shouldRedirectToTracesListOnDeleteSuccess
					) {
						history.push(ROUTES.TRACES_FUNNELS);
						return;
					}
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
			destroyOnClose
		>
			<div className="delete-funnel-modal-content">
				Deleting the funnel would stop further analytics using this funnel. This is
				irreversible and cannot be undone.
			</div>
		</SignozModal>
	);
}

DeleteFunnel.defaultProps = {
	shouldRedirectToTracesListOnDeleteSuccess: true,
};

export default DeleteFunnel;
