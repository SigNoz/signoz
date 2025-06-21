import './DeleteFunnelStep.styles.scss';

import SignozModal from 'components/SignozModal/SignozModal';
import { Trash2, X } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';

interface DeleteFunnelStepProps {
	isOpen: boolean;
	onClose: () => void;
	onStepRemove: () => void;
}

function DeleteFunnelStep({
	isOpen,
	onClose,
	onStepRemove,
}: DeleteFunnelStepProps): JSX.Element {
	const { handleRunFunnel } = useFunnelContext();
	const handleStepRemoval = (): void => {
		onStepRemove();
		handleRunFunnel();
		onClose();
	};

	return (
		<SignozModal
			open={isOpen}
			title="Delete this step"
			width={390}
			onCancel={onClose}
			rootClassName="funnel-modal delete-funnel-modal"
			cancelText="Cancel"
			okText="Delete Step"
			okButtonProps={{
				icon: <Trash2 size={14} />,
				type: 'primary',
				className: 'funnel-modal__ok-btn',
				onClick: handleStepRemoval,
			}}
			cancelButtonProps={{
				icon: <X size={14} />,
				type: 'text',
				className: 'funnel-modal__cancel-btn',
				onClick: onClose,
			}}
			destroyOnClose
		>
			<div className="delete-funnel-modal-content">
				Deleting this step would stop further analytics using this step of the
				funnel.
			</div>
		</SignozModal>
	);
}

export default DeleteFunnelStep;
