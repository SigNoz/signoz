import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Typography } from 'antd';
import { ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';

import TestConnection from './TestConnection';

interface IntegrationDetailHeaderProps {
	id: string;
	title: string;
	description: string;
	icon: string;
}
function IntegrationDetailHeader(
	props: IntegrationDetailHeaderProps,
): JSX.Element {
	const { id, title, icon, description } = props;
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
		<div className="integration-connection-header">
			<div className="integration-detail-header" key={id}>
				<div className="image-container">
					<img src={icon} alt={title} className="image" />
				</div>
				<div className="details">
					<Typography.Text className="heading">{title}</Typography.Text>
					<Typography.Text className="description">{description}</Typography.Text>
				</div>
				<Button
					className="configure-btn"
					icon={<ArrowLeftRight size={14} />}
					onClick={(): void => showModal()}
				>
					Connect {title}
				</Button>
			</div>
			<TestConnection />

			<Modal
				className="test-connection-modal"
				open={isModalOpen}
				title="Test Connection"
				onOk={handleOk}
				onCancel={handleCancel}
				okText="I Understand"
				cancelButtonProps={{ style: { display: 'none' } }}
			>
				<div className="connection-content">
					<TestConnection />
					<div className="data-info">
						<Typography.Text className="last-data">
							Last recieved from
						</Typography.Text>
						<Typography.Text className="last-value">
							redis.service.alert
						</Typography.Text>
					</div>
					<div className="data-info">
						<Typography.Text className="last-data">Last recieved at</Typography.Text>
						<Typography.Text className="last-value">
							27.02.2024⎯10:30:23
						</Typography.Text>
					</div>
				</div>
			</Modal>
		</div>
	);
}

export default IntegrationDetailHeader;
