import { useState } from 'react';
import { useMutation } from 'react-query';
import { Button } from '@signozhq/button';
import { Modal } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import removeAwsIntegrationAccount from 'api/integration/aws/removeAwsIntegrationAccount';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { INTEGRATION_TELEMETRY_EVENTS } from 'container/Integrations/constants';
import { useNotifications } from 'hooks/useNotifications';
import { Unlink } from 'lucide-react';

import './RemoveIntegrationAccount.scss';

function RemoveIntegrationAccount({
	accountId,
	onRemoveIntegrationAccountSuccess,
}: {
	accountId: string;
	onRemoveIntegrationAccountSuccess: () => void;
}): JSX.Element {
	const { notifications } = useNotifications();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleDisconnect = (): void => {
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
		<div className="remove-integration-account-container">
			<Button
				variant="solid"
				color="destructive"
				prefixIcon={<Unlink size={14} />}
				size="sm"
				onClick={handleDisconnect}
				disabled={isRemoveIntegrationLoading}
			>
				Disconnect
			</Button>

			<Modal
				className="remove-integration-account-modal"
				open={isModalOpen}
				title="Remove integration"
				onOk={handleOk}
				onCancel={handleCancel}
				okText="Remove Account"
				okButtonProps={{
					danger: true,
					loading: isRemoveIntegrationLoading,
				}}
			>
				Removing this account will remove all components created for sending
				telemetry to SigNoz in your AWS account within the next ~15 minutes
				(cloudformation stacks named signoz-integration-telemetry-collection in
				enabled regions). <br />
				<br />
				After that, you can delete the cloudformation stack that was created
				manually when connecting this account.
			</Modal>
		</div>
	);
}

export default RemoveIntegrationAccount;
