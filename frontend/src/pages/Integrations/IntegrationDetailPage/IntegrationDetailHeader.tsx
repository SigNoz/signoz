/* eslint-disable no-nested-ternary */
import './IntegrationDetailPage.styles.scss';

import { Button, Modal, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import installIntegration from 'api/Integrations/installIntegration';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'react-query';
import { IntegrationConnectionStatus } from 'types/api/integrations/types';

import { INTEGRATION_TELEMETRY_EVENTS } from '../utils';
import TestConnection, { ConnectionStates } from './TestConnection';

interface IntegrationDetailHeaderProps {
	id: string;
	title: string;
	description: string;
	icon: string;
	onUnInstallSuccess: () => void;
	connectionState: ConnectionStates;
	connectionData: IntegrationConnectionStatus;
	setActiveDetailTab: React.Dispatch<React.SetStateAction<string | null>>;
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
		onUnInstallSuccess,
		setActiveDetailTab,
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
				onUnInstallSuccess();
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
	const isConnectionStatePending =
		connectionState === ConnectionStates.NotInstalled ||
		connectionState === ConnectionStates.TestingConnection;

	const isConnectionStateNotInstalled =
		connectionState === ConnectionStates.NotInstalled;
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
					className={cx(
						'configure-btn',
						!isConnectionStateNotInstalled && 'test-connection',
					)}
					icon={<ArrowLeftRight size={14} />}
					disabled={isInstallLoading}
					onClick={(): void => {
						if (connectionState === ConnectionStates.NotInstalled) {
							logEvent(INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_DETAIL_CONNECT, {
								integration: id,
							});
						} else {
							logEvent(
								INTEGRATION_TELEMETRY_EVENTS.INTEGRATIONS_DETAIL_TEST_CONNECTION,
								{
									integration: id,
									connectionStatus: connectionState,
								},
							);
						}
						showModal();
					}}
				>
					{isConnectionStateNotInstalled ? `Connect ${title}` : `Test Connection`}
				</Button>
			</div>

			{connectionState !== ConnectionStates.NotInstalled && (
				<TestConnection connectionState={connectionState} />
			)}

			<Modal
				className="test-connection-modal"
				open={isModalOpen}
				title={
					isConnectionStateNotInstalled
						? `Connect ${title}`
						: `Test ${title} Connection`
				}
				onCancel={handleCancel}
				footer={
					<div
						className={cx(
							'connection-footer',
							!isConnectionStatePending && 'not-pending',
						)}
					>
						<Button
							type="text"
							icon={
								isConnectionStateNotInstalled ? <ConfigureIcon /> : <Check size={14} />
							}
							onClick={(): void => {
								if (isConnectionStateNotInstalled) {
									setActiveDetailTab('configuration');
								}
								handleOk();
							}}
							className="understandBtn"
						>
							{isConnectionStatePending
								? isConnectionStateNotInstalled
									? 'Show Configuration Steps'
									: 'I have already configured'
								: 'I understand'}
						</Button>
						{isConnectionStatePending && (
							<Button
								type="primary"
								icon={
									isConnectionStateNotInstalled ? <Check size={14} /> : <ConfigureIcon />
								}
								onClick={(): void => {
									if (isConnectionStateNotInstalled) {
										mutate({ integration_id: id, config: {} });
									} else {
										setActiveDetailTab('configuration');
									}

									handleOk();
								}}
								className="configureBtn"
							>
								{isConnectionStateNotInstalled
									? 'I have already configured'
									: 'Show Configuration Steps'}
							</Button>
						)}
					</div>
				}
			>
				<div className="connection-content">
					{!isConnectionStateNotInstalled && (
						<TestConnection connectionState={connectionState} />
					)}
					{connectionState === ConnectionStates.Connected ||
					connectionState === ConnectionStates.NoDataSinceLong ? (
						<>
							<div className="data-info">
								<Typography.Text className="last-data">
									Last recieved from
								</Typography.Text>
								<div className="connection-line" />
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
								<div className="connection-line" />
								<Tooltip
									title={
										latestData.last_received_ts_ms
											? // eslint-disable-next-line sonarjs/no-duplicate-string
											  dayjs(latestData.last_received_ts_ms).format(
													DATE_TIME_FORMATS.MONTH_DATETIME_SHORT,
											  )
											: ''
									}
									key={
										latestData.last_received_ts_ms
											? dayjs(latestData.last_received_ts_ms).format(
													DATE_TIME_FORMATS.MONTH_DATETIME_SHORT,
											  )
											: ''
									}
									placement="right"
								>
									<Typography.Text className="last-value" ellipsis>
										{latestData.last_received_ts_ms
											? dayjs(latestData.last_received_ts_ms).format(
													DATE_TIME_FORMATS.MONTH_DATETIME_SHORT,
											  )
											: ''}
									</Typography.Text>
								</Tooltip>
							</div>
						</>
					) : connectionState === ConnectionStates.TestingConnection ? (
						<div className="data-test-connection">
							<div className="last-data">
								We have not received data from your {title} Instance yet. You need to
								manually configure your {title} instance to start sending data to
								SigNoz.
							</div>
							<div className="last-data">
								If you have already configured your resources to send data, sit tight
								and wait for the data to flow in, Or else, see the steps to configure
								your resources to start sending data.
							</div>
						</div>
					) : isConnectionStateNotInstalled ? (
						<div className="data-test-connection">
							<div className="last-data">
								You would need to manually configure your {title} instance to start
								sending data to SigNoz.
							</div>
							<div className="last-data">
								If you have already configured your resources to send data, sit tight
								and wait for the data to flow in, Or else, see the steps to configure
								your resources to start sending data.
							</div>
						</div>
					) : null}
				</div>
			</Modal>
		</div>
	);
}

export default IntegrationDetailHeader;
