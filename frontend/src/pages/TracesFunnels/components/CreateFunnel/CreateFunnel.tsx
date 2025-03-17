import '../RenameFunnel/RenameFunnel.styles.scss';

import { Input } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useCreateFunnel } from 'hooks/TracesFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import { generatePath } from 'react-router-dom';

interface CreateFunnelProps {
	isOpen: boolean;
	onClose: () => void;
}

function CreateFunnel({ isOpen, onClose }: CreateFunnelProps): JSX.Element {
	const [funnelName, setFunnelName] = useState<string>('');
	const createFunnelMutation = useCreateFunnel();
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();
	const { safeNavigate } = useSafeNavigate();

	const handleCreate = (): void => {
		createFunnelMutation.mutate(
			{
				funnel_name: funnelName,
				creation_timestamp: new Date().getTime(),
			},
			{
				onSuccess: (data) => {
					notifications.success({
						message: 'Funnel created successfully',
					});
					setFunnelName('');
					queryClient.invalidateQueries([REACT_QUERY_KEY.GET_FUNNELS_LIST]);
					onClose();
					if (data?.payload?.funnel_id) {
						safeNavigate(
							generatePath(ROUTES.TRACES_FUNNELS_DETAILS, {
								funnelId: data.payload.funnel_id,
							}),
						);
					}
				},
				onError: () => {
					notifications.error({
						message: 'Failed to create funnel',
					});
				},
			},
		);
	};

	const handleCancel = (): void => {
		setFunnelName('');
		onClose();
	};

	return (
		<SignozModal
			open={isOpen}
			title="Create new funnel"
			width={384}
			onCancel={handleCancel}
			rootClassName="funnel-modal"
			cancelText="Cancel"
			okText="Create Funnel"
			okButtonProps={{
				icon: <Check size={14} />,
				loading: createFunnelMutation.isLoading,
				type: 'primary',
				className: 'funnel-modal__ok-btn',
				onClick: handleCreate,
				disabled: !funnelName.trim(),
			}}
			cancelButtonProps={{
				icon: <X size={14} />,
				type: 'text',
				className: 'funnel-modal__cancel-btn',
				onClick: handleCancel,
			}}
			getContainer={document.getElementById('root') || undefined}
			destroyOnClose
		>
			<div className="funnel-modal-content">
				<span className="funnel-modal-content__label">Enter funnel name</span>
				<Input
					className="funnel-modal-content__input"
					value={funnelName}
					onChange={(e): void => setFunnelName(e.target.value)}
					placeholder="Eg. checkout dropoff funnel"
					autoFocus
				/>
			</div>
		</SignozModal>
	);
}

export default CreateFunnel;
