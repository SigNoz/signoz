import './AddFunnelStepDetailsModal.styles.scss';

import { Input } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useUpdateFunnelStepDetails } from 'hooks/TracesFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { Check, X } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useState } from 'react';
import { useQueryClient } from 'react-query';

interface AddFunnelStepDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	stepOrder: number;
}

function AddFunnelStepDetailsModal({
	isOpen,
	onClose,
	stepOrder,
}: AddFunnelStepDetailsModalProps): JSX.Element {
	const { funnelId } = useFunnelContext();
	const [stepName, setStepName] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();

	const {
		mutate: updateFunnelStepDetails,
		isLoading,
	} = useUpdateFunnelStepDetails({ stepOrder });

	const handleCancel = (): void => {
		setStepName('');
		setDescription('');
		onClose();
	};

	const handleSave = (): void => {
		updateFunnelStepDetails(
			{
				funnel_id: funnelId,
				steps: [
					{
						step_name: stepName,
						description,
					},
				],
				updated_timestamp: Date.now(),
			},
			{
				onSuccess: () => {
					queryClient.invalidateQueries([
						REACT_QUERY_KEY.GET_FUNNEL_DETAILS,
						funnelId,
					]);
					console.log('funnelId', funnelId);
					notifications.success({
						message: 'Success',
						description: 'Funnel step details updated successfully',
					});
					handleCancel();
				},
				onError: (error) => {
					notifications.error({
						message: 'Failed to update funnel step details',
						description: error.message,
					});
				},
			},
		);
	};

	return (
		<SignozModal
			open={isOpen}
			title="Add funnel step details"
			width={384}
			onCancel={handleCancel}
			rootClassName="funnel-step-modal funnel-modal signoz-modal"
			cancelText="Cancel"
			okText="Save changes"
			okButtonProps={{
				icon: <Check size={14} />,
				type: 'primary',
				className: 'funnel-step-modal__ok-btn',
				onClick: handleSave,
				disabled: !stepName.trim(),
				loading: isLoading,
			}}
			cancelButtonProps={{
				icon: <X size={14} />,
				type: 'text',
				className: 'funnel-step-modal__cancel-btn',
				onClick: handleCancel,
				disabled: isLoading,
			}}
			destroyOnClose
		>
			<div className="funnel-step-modal-content">
				<div className="funnel-step-modal-content__field">
					<span className="funnel-step-modal-content__label">Step name</span>
					<Input
						className="funnel-step-modal-content__input"
						placeholder="Eg. checkout-dropoff-funnel-step1"
						value={stepName}
						onChange={(e): void => setStepName(e.target.value)}
						autoFocus
						disabled={isLoading}
					/>
				</div>
				<div className="funnel-step-modal-content__field">
					<span className="funnel-step-modal-content__label">Description</span>
					<Input.TextArea
						className="funnel-step-modal-content__input"
						placeholder="Eg. checkout dropoff funnel"
						value={description}
						onChange={(e): void => setDescription(e.target.value)}
						autoSize={{ minRows: 3, maxRows: 5 }}
						disabled={isLoading}
					/>
				</div>
			</div>
		</SignozModal>
	);
}

export default AddFunnelStepDetailsModal;
