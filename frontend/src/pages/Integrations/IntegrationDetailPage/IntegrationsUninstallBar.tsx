import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Typography } from 'antd';
import unInstallIntegration from 'api/Integrations/uninstallIntegration';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'react-query';

interface IntergrationsUninstallBarProps {
	integrationTitle: string;
	integrationId: string;
	refetchIntegrationDetails: () => void;
}
function IntergrationsUninstallBar(
	props: IntergrationsUninstallBarProps,
): JSX.Element {
	const { integrationTitle, integrationId, refetchIntegrationDetails } = props;
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		mutate: uninstallIntegration,
		isLoading: isUninstallLoading,
	} = useMutation(unInstallIntegration, {
		onSuccess: () => {
			refetchIntegrationDetails();
			setIsModalOpen(false);
		},
		onError: () => {},
	});

	const showModal = (): void => {
		setIsModalOpen(true);
	};

	const handleOk = (): void => {
		uninstallIntegration({
			integrationId,
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
				Remove from SigNoz
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

export default IntergrationsUninstallBar;
