import './RemoveIntegrationAccount.scss';

import { Button, Modal } from 'antd';
import logEvent from 'api/common/logEvent';
import removeAwsIntegrationAccount from 'api/Integrations/removeAwsIntegrationAccount';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import { X } from 'lucide-react';
import { INTEGRATION_TELEMETRY_EVENTS } from 'pages/Integrations/utils';
import { useState } from 'react';
import { useMutation } from 'react-query';

function RemoveIntegrationAccount({
	accountId,
	onRemoveIntegrationAccountSuccess,
}: {
	accountId: string;
	onRemoveIntegrationAccountSuccess: () => void;
}): JSX.Element {
	const { notifications } = useNotifications();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const showModal = (): void => {
		setIsModalOpen(true);
	};

	const {
		mutate: removeIntegration,
		isLoading: isRemoveIntegrationLoading,
	} = useMutation(removeAwsIntegrationAccount, {
		onSuccess: () => {
			onRemoveIntegrationAccountSuccess?.();
			setIsModalOpen(false);
		},
		onError: () => {
			notifications.error({
				message: SOMETHING_WENT_WRONG,
			});
		},
	});
	const handleOk = (): void => {
		logEvent(INTEGRATION_TELEMETRY_EVENTS.AWS_INTEGRATION_ACCOUNT_REMOVED, {
			accountId,
		});
		removeIntegration(accountId);
	};

	const handleCancel = (): void => {
		setIsModalOpen(false);
	};

	return (
		<div className="remove-integration-account">
			<div className="remove-integration-account__header">
				<div className="remove-integration-account__title">Remove Integration</div>
				<div className="remove-integration-account__subtitle">
					Removing this integration won&apos;t delete any existing data but will stop
					collecting new data from AWS.
				</div>
			</div>
			<Button
				className="remove-integration-account__button"
				icon={<X size={14} />}
				onClick={(): void => showModal()}
			>
				Remove
			</Button>
			<Modal
				className="remove-integration-modal"
				open={isModalOpen}
				title="Remove integration"
				onOk={handleOk}
				onCancel={handleCancel}
				okText="Remove Integration"
				okButtonProps={{
					danger: true,
					disabled: isRemoveIntegrationLoading,
				}}
			>
				<div className="remove-integration-modal__text">
					Removing this account will remove all components created for sending
					telemetry to SigNoz in your AWS account within the next ~15 minutes
					(cloudformation stacks named signoz-integration-telemetry-collection in
					enabled regions). <br />
					<br />
					After that, you can delete the cloudformation stack that was created
					manually when connecting this account.
				</div>
			</Modal>
		</div>
	);
}

export default RemoveIntegrationAccount;
