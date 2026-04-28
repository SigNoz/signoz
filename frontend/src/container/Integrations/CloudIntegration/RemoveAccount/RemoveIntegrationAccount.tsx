import { useState } from 'react';
import { Button } from '@signozhq/ui';
import { Modal } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { useDisconnectAccount } from 'api/generated/services/cloudintegration';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import {
	INTEGRATION_TELEMETRY_EVENTS,
	INTEGRATION_TYPES,
} from 'container/Integrations/constants';
import { useNotifications } from 'hooks/useNotifications';
import { Unlink } from 'lucide-react';

import './RemoveIntegrationAccount.scss';

function RemoveIntegrationAccount({
	cloudProvider,
	accountId,
	onRemoveIntegrationAccountSuccess,
}: {
	cloudProvider: string;
	accountId: string;
	onRemoveIntegrationAccountSuccess: () => void;
}): JSX.Element {
	const { notifications } = useNotifications();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleDisconnect = (): void => {
		setIsModalOpen(true);
	};

	const { mutate: disconnectAccount, isLoading: isRemoveIntegrationLoading } =
		useDisconnectAccount({
			mutation: {
				onSuccess: () => {
					onRemoveIntegrationAccountSuccess?.();
					setIsModalOpen(false);
				},
				onError: () => {
					notifications.error({
						message: SOMETHING_WENT_WRONG,
					});
				},
			},
		});
	const handleOk = (): void => {
		logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATION_ACCOUNT_REMOVED, {
			accountId,
			integration: cloudProvider,
		});
		disconnectAccount({
			pathParams: {
				cloudProvider,
				id: accountId,
			},
		});
	};

	const handleCancel = (): void => {
		setIsModalOpen(false);
	};

	return (
		<div className="remove-integration-account-container">
			<Button
				variant="solid"
				color="destructive"
				prefix={<Unlink size={14} />}
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
				{cloudProvider === INTEGRATION_TYPES.AWS ? (
					<>
						Removing this account will remove all components created for sending
						telemetry to SigNoz in your AWS account within the next ~15 minutes
						(cloudformation stacks named signoz-integration-telemetry-collection in
						enabled regions). <br />
						<br />
						After that, you can delete the cloudformation stack that was created
						manually when connecting this account.
					</>
				) : (
					<>
						Removing this account will remove all components created for sending
						telemetry to SigNoz in your Azure subscription within the next ~15 minutes
						(deployment stack named signoz-integration-telemetry will be deleted
						automatically). <br />
						<br />
						After that, you have to manually delete &apos;signoz-integration&apos;
						deployment stack that was created while connecting this account (Takes ~20
						minutes to delete).
					</>
				)}
			</Modal>
		</div>
	);
}

export default RemoveIntegrationAccount;
