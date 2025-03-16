import './RenameFunnel.styles.scss';

import { Input } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { useRenameFunnel } from 'hooks/useFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

interface RenameFunnelProps {
	isOpen: boolean;
	onClose: () => void;
	funnelId: string;
	initialName: string;
}

function RenameFunnel({
	isOpen,
	onClose,
	funnelId,
	initialName,
}: RenameFunnelProps): JSX.Element {
	const [newFunnelName, setNewFunnelName] = useState<string>(initialName);
	const renameFunnelMutation = useRenameFunnel();
	const { notifications } = useNotifications();

	const handleRename = (): void => {
		renameFunnelMutation.mutate(
			{ id: funnelId, funnel_name: newFunnelName },
			{
				onSuccess: () => {
					notifications.success({
						message: 'Funnel renamed successfully',
					});
					onClose();
				},
				onError: () => {
					notifications.error({
						message: 'Failed to rename funnel',
					});
				},
			},
		);
	};

	const handleCancel = (): void => {
		setNewFunnelName(initialName);
		onClose();
	};

	return (
		<SignozModal
			open={isOpen}
			title="Rename Funnel"
			width={384}
			onCancel={handleCancel}
			rootClassName="rename-funnel"
			cancelText="Cancel"
			okText="Rename Funnel"
			okButtonProps={{
				icon: <Check size={14} />,
				loading: renameFunnelMutation.isLoading,
				type: 'primary',
				className: 'rename-funnel__ok-btn',
				onClick: handleRename,
				disabled: newFunnelName === initialName,
			}}
			cancelButtonProps={{
				icon: <X size={14} />,
				type: 'text',
				className: 'rename-funnel__cancel-btn',
				onClick: handleCancel,
			}}
		>
			<div className="rename-funnel-content">
				<span className="rename-funnel-content__label">Enter a new name</span>
				<Input
					className="rename-funnel-content__input"
					value={newFunnelName}
					onChange={(e): void => setNewFunnelName(e.target.value)}
				/>
			</div>
		</SignozModal>
	);
}

export default RenameFunnel;
