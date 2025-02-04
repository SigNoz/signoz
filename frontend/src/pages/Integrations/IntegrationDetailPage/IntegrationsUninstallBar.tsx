import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import unInstallIntegration from 'api/Integrations/uninstallIntegration';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'react-query';

import { INTEGRATION_TELEMETRY_EVENTS } from '../utils';
import { ConnectionStates } from './TestConnection';

interface IntergrationsUninstallBarProps {
	integrationTitle: string;
	integrationId: string;
	onUnInstallSuccess: () => void;
	connectionStatus: ConnectionStates;
	removeIntegrationTitle?: string;
}
function IntergrationsUninstallBar(
	props: IntergrationsUninstallBarProps,
): JSX.Element {
	const {
		integrationTitle,
		integrationId,
		onUnInstallSuccess,
		connectionStatus,
		removeIntegrationTitle = 'Remove from SigNoz',
	} = props;
	const { notifications } = useNotifications();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		mutate: uninstallIntegration,
		isLoading: isUninstallLoading,
	} = useMutation(unInstallIntegration, {
		onSuccess: () => {
			onUnInstallSuccess?.();
			setIsModalOpen(false);
		},
		onError: () => {
			notifications.error({
				message: SOMETHING_WENT_WRONG,
			});
		},
	});

	const showModal = (): void => {
		setIsModalOpen(true);
	};

	const handleOk = (): void => {
		logEvent(
			INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_DETAIL_REMOVE_INTEGRATION,
			{
				integration: integrationId,
				integrationStatus: connectionStatus,
			},
		);
		uninstallIntegration({
			integration_id: integrationId,
		});
	};

	const handleCancel = (): void => {
		setIsModalOpen(false);
	};
	return (
		<div className="uninstall-integration-bar">
			<div className="unintall-integration-bar-text">
				<Typography.Text className="heading">Remove Integration</Typography.Text>
				<Typography.Text className="subtitle">
					Removing the {integrationTitle} integration would make your workspace stop
					listening for data from {integrationTitle} instances.
				</Typography.Text>
			</div>
			<Button
				className="uninstall-integration-btn"
				icon={<X size={14} />}
				onClick={(): void => showModal()}
			>
				{removeIntegrationTitle}
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
					disabled: isUninstallLoading,
				}}
			>
				<Typography.Text className="remove-integration-text">
					Removing this integration makes SigNoz stop listening for data from{' '}
					{integrationTitle} instances. You would still have to manually remove the
					configuration in your code to stop sending data.
				</Typography.Text>
			</Modal>
		</div>
	);
}

IntergrationsUninstallBar.defaultProps = {
	removeIntegrationTitle: 'Remove from SigNoz',
};

export default IntergrationsUninstallBar;
