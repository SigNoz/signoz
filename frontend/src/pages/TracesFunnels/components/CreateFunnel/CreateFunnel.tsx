import '../RenameFunnel/RenameFunnel.styles.scss';

import { Input } from 'antd';
import logEvent from 'api/common/logEvent';
import axios from 'axios';
import SignozModal from 'components/SignozModal/SignozModal';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useCreateFunnel } from 'hooks/TracesFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from 'react-query';
import { generatePath, matchPath, useLocation } from 'react-router-dom';

interface CreateFunnelProps {
	isOpen: boolean;
	onClose: (funnelId?: string) => void;
	redirectToDetails?: boolean;
}

function CreateFunnel({
	isOpen,
	onClose,
	redirectToDetails,
}: CreateFunnelProps): JSX.Element {
	const [funnelName, setFunnelName] = useState<string>('');
	const [inputError, setInputError] = useState<string>('');
	const createFunnelMutation = useCreateFunnel();
	const { notifications } = useNotifications();
	const queryClient = useQueryClient();
	const { safeNavigate } = useSafeNavigate();
	const { pathname } = useLocation();

	const handleCreate = (): void => {
		createFunnelMutation.mutate(
			{
				funnel_name: funnelName,
				timestamp: new Date().getTime(),
			},
			{
				onSuccess: (data) => {
					notifications.success({
						message: 'Funnel created successfully',
					});

					const eventMessage = matchPath(pathname, ROUTES.TRACE_DETAIL)
						? 'Trace Funnels: Funnel created from trace details page'
						: 'Trace Funnels: Funnel created from trace funnels list page';

					logEvent(eventMessage, {});

					setFunnelName('');
					setInputError('');
					queryClient.invalidateQueries([REACT_QUERY_KEY.GET_FUNNELS_LIST]);

					const funnelId = data?.payload?.funnel_id;

					onClose(funnelId);
					if (funnelId && redirectToDetails) {
						safeNavigate(
							generatePath(ROUTES.TRACES_FUNNELS_DETAIL, {
								funnelId,
							}),
						);
					}
				},
				onError: (error) => {
					if (axios.isAxiosError(error) && error.response?.status === 400) {
						const errorMessage =
							error.response?.data?.error?.message || 'Invalid funnel name';
						setInputError(errorMessage);
					} else {
						notifications.error({
							message: axios.isAxiosError(error)
								? error.response?.data?.error?.message
								: 'Failed to create funnel',
						});
					}
				},
			},
		);
	};

	const handleCancel = (): void => {
		setFunnelName('');
		setInputError('');
		onClose();
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setFunnelName(e.target.value);
		if (inputError) {
			setInputError('');
		}
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
					className={`funnel-modal-content__input${
						inputError ? ' funnel-modal-content__input--error' : ''
					}`}
					value={funnelName}
					onChange={handleInputChange}
					placeholder="Eg. checkout dropoff funnel"
					autoFocus
					status={inputError && 'error'}
				/>
				{inputError && (
					<span className="funnel-modal-content__error">{inputError}</span>
				)}
			</div>
		</SignozModal>
	);
}

CreateFunnel.defaultProps = {
	redirectToDetails: true,
};
export default CreateFunnel;
