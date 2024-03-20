/* eslint-disable no-nested-ternary */
import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Tooltip, Typography } from 'antd';
import installIntegration from 'api/Integrations/installIntegration';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'react-query';
import { IntegrationConnectionStatus } from 'types/api/integrations/types';

import TestConnection, { ConnectionStates } from './TestConnection';

interface IntegrationDetailHeaderProps {
	id: string;
	title: string;
	description: string;
	icon: string;
	refetchIntegrationDetails: () => void;
	connectionState: ConnectionStates;
	connectionData: IntegrationConnectionStatus;
}
// eslint-disable-next-line sonarjs/cognitive-complexity
function IntegrationDetailHeader(
	props: IntegrationDetailHeaderProps,
): JSX.Element {
	const {
		id,
		title,
		icon,
		description,
		connectionState,
		connectionData,
		refetchIntegrationDetails,
	} = props;
	const [isModalOpen, setIsModalOpen] = useState(false);

	const { notifications } = useNotifications();

	const showModal = (): void => {
		setIsModalOpen(true);
	};

	const handleOk = (): void => {
		setIsModalOpen(false);
	};

	const handleCancel = (): void => {
		setIsModalOpen(false);
	};

	const { mutate, isLoading: isInstallLoading } = useMutation(
		installIntegration,
		{
			onSuccess: () => {
				refetchIntegrationDetails();
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		},
	);

	let latestData: {
		last_received_ts_ms: number | null;
		last_received_from: string | null;
	} = {
		last_received_ts_ms: null,
		last_received_from: null,
	};

	if (
		connectionData.logs?.last_received_ts_ms &&
		connectionData.metrics?.last_received_ts_ms
	) {
		if (
			connectionData.logs.last_received_ts_ms >
			connectionData.metrics.last_received_ts_ms
		) {
			latestData = {
				last_received_ts_ms: connectionData.logs.last_received_ts_ms,
				last_received_from: connectionData.logs.last_received_from,
			};
		} else {
			latestData = {
				last_received_ts_ms: connectionData.metrics.last_received_ts_ms,
				last_received_from: connectionData.metrics.last_received_from,
			};
		}
	} else if (connectionData.logs?.last_received_ts_ms) {
		latestData = {
			last_received_ts_ms: connectionData.logs.last_received_ts_ms,
			last_received_from: connectionData.logs.last_received_from,
		};
	} else if (connectionData.metrics?.last_received_ts_ms) {
		latestData = {
			last_received_ts_ms: connectionData.metrics.last_received_ts_ms,
			last_received_from: connectionData.metrics.last_received_from,
		};
	}
	return (
		<div className="integration-connection-header">
			<div className="integration-detail-header" key={id}>
				<div style={{ display: 'flex', gap: '10px' }}>
					<div className="image-container">
						<img src={icon} alt={title} className="image" />
					</div>
					<div className="details">
						<Typography.Text className="heading">{title}</Typography.Text>
						<Typography.Text className="description">{description}</Typography.Text>
					</div>
				</div>
				<Button
					className="configure-btn"
					icon={<ArrowLeftRight size={14} />}
					disabled={isInstallLoading}
					onClick={(): void => {
						if (connectionState === ConnectionStates.NotInstalled) {
							mutate({ integration_id: id, config: {} });
						} else {
							showModal();
						}
					}}
				>
					{connectionState === ConnectionStates.NotInstalled
						? `Connect ${title}`
						: `Test Connection`}
				</Button>
			</div>

			{connectionState !== ConnectionStates.NotInstalled && (
				<TestConnection connectionState={connectionState} />
			)}

			<Modal
				className="test-connection-modal"
				open={isModalOpen}
				title="Test Connection"
				onOk={handleOk}
				onCancel={handleCancel}
				okText="I understand"
				okButtonProps={{ className: 'understandBtn', icon: <Check size={14} /> }}
				cancelButtonProps={{ style: { display: 'none' } }}
			>
				<div className="connection-content">
					<TestConnection connectionState={connectionState} />
					{connectionState === ConnectionStates.Connected ||
					connectionState === ConnectionStates.NoDataSinceLong ? (
						<>
							<div className="data-info">
								<Typography.Text className="last-data">
									Last recieved from
								</Typography.Text>
								<Tooltip
									title={latestData.last_received_from}
									key={latestData.last_received_from}
									placement="right"
								>
									<Typography.Text className="last-value" ellipsis>
										{latestData.last_received_from}
									</Typography.Text>
								</Tooltip>
							</div>
							<div className="data-info">
								<Typography.Text className="last-data">
									Last recieved at
								</Typography.Text>
								<Tooltip
									title={
										latestData.last_received_ts_ms
											? // eslint-disable-next-line sonarjs/no-duplicate-string
											  dayjs(latestData.last_received_ts_ms).format('DD MMM YYYY HH:mm')
											: ''
									}
									key={
										latestData.last_received_ts_ms
											? dayjs(latestData.last_received_ts_ms).format('DD MMM YYYY HH:mm')
											: ''
									}
									placement="right"
								>
									<Typography.Text className="last-value" ellipsis>
										{latestData.last_received_ts_ms
											? dayjs(latestData.last_received_ts_ms).format('DD MMM YYYY HH:mm')
											: ''}
									</Typography.Text>
								</Tooltip>
							</div>
						</>
					) : connectionState === ConnectionStates.TestingConnection ? (
						<div className="data-test-connection">
							<div className="last-data">
								After adding the {title} integration, you need to manually configure
								your Redis data source to start sending data to SigNoz.
							</div>
							<div className="last-data">
								The status bar above would turn green if we are successfully receiving
								the data.
							</div>
						</div>
					) : null}
				</div>
			</Modal>
		</div>
	);
}

export default IntegrationDetailHeader;
