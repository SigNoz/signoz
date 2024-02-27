import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Typography } from 'antd';
import { X } from 'lucide-react';
import { useState } from 'react';

interface IntergrationsUninstallBarProps {
	integrationTitle: string;
}
function IntergrationsUninstallBar(
	props: IntergrationsUninstallBarProps,
): JSX.Element {
	const { integrationTitle } = props;
	const [isModalOpen, setIsModalOpen] = useState(false);

	const showModal = (): void => {
		setIsModalOpen(true);
	};

	const handleOk = (): void => {
		setIsModalOpen(false);
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
					listening for data from Redis instances.
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
				}}
			>
				<Typography.Text>
					Removing this integration makes SigNoz stop listening for data from{' '}
					{integrationTitle} instances. You would still have to manually remove the
					configuration in your code to stop sending data.
				</Typography.Text>
			</Modal>
		</div>
	);
}

export default IntergrationsUninstallBar;
