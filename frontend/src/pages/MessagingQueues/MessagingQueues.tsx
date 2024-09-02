import './MessagingQueues.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Modal } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Calendar, ListMinus } from 'lucide-react';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { isCloudUser } from 'utils/app';

import {
	KAFKA_SETUP_DOC_LINK,
	MessagingQueuesViewType,
} from './MessagingQueuesUtils';
import { ComingSoon } from './MQCommon/MQCommon';

function MessagingQueues(): JSX.Element {
	const history = useHistory();

	const { confirm } = Modal;

	const showConfirm = (): void => {
		logEvent('Messaging Queues: View details clicked', {
			page: 'Messaging Queues Overview',
			source: 'Consumer Latency view',
		});

		confirm({
			icon: <ExclamationCircleFilled />,
			content:
				'Before navigating to the details page, please make sure you have configured all the required setup to ensure correct data monitoring.',
			className: 'overview-confirm-modal',
			onOk() {
				logEvent('Messaging Queues: Proceed button clicked', {
					page: 'Messaging Queues Overview',
				});
				history.push(ROUTES.MESSAGING_QUEUES_DETAIL);
			},
			okText: 'Proceed',
		});
	};

	const isCloudUserVal = isCloudUser();

	const getStartedRedirect = (link: string, sourceCard: string): void => {
		logEvent('Messaging Queues: Get started clicked', {
			source: sourceCard,
			link: isCloudUserVal ? link : KAFKA_SETUP_DOC_LINK,
		});
		if (isCloudUserVal) {
			history.push(link);
		} else {
			window.open(KAFKA_SETUP_DOC_LINK, '_blank');
		}
	};

	useEffect(() => {
		logEvent('Messaging Queues: Overview page visited', {});
	}, []);

	return (
		<div className="messaging-queue-container">
			<div className="messaging-breadcrumb">
				<ListMinus size={16} />
				Messaging Queues
			</div>
			<div className="messaging-header">
				<div className="header-config">Kafka / Overview</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className="messaging-overview">
				<p className="overview-text">
					Start sending data in as little as 20 minutes
				</p>
				<p className="overview-subtext">Connect and Monitor Your Data Streams</p>
				<div className="overview-doc-area">
					<div className="overview-info-card">
						<div>
							<p className="card-title">Configure Consumer</p>
							<p className="card-info-text">
								Connect your consumer and producer data sources to start monitoring.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									getStartedRedirect(
										ROUTES.GET_STARTED_APPLICATION_MONITORING,
										'Configure Consumer',
									)
								}
							>
								Get Started
							</Button>
						</div>
					</div>
					<div className="overview-info-card middle-card">
						<div>
							<p className="card-title">Configure Producer</p>
							<p className="card-info-text">
								Connect your consumer and producer data sources to start monitoring.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									getStartedRedirect(
										ROUTES.GET_STARTED_APPLICATION_MONITORING,
										'Configure Producer',
									)
								}
							>
								Get Started
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">Monitor kafka</p>
							<p className="card-info-text">
								Set up your Kafka monitoring to track consumer and producer activities.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									getStartedRedirect(
										ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING,
										'Monitor kafka',
									)
								}
							>
								Get Started
							</Button>
						</div>
					</div>
				</div>
				<div className="summary-section">
					<div className="summary-card">
						<div className="summary-title">
							<p>{MessagingQueuesViewType.consumerLag.label}</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<Button type="primary" onClick={showConfirm}>
								View Details
							</Button>
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>{MessagingQueuesViewType.partitionLatency.label}</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>{MessagingQueuesViewType.producerLatency.label}</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>{MessagingQueuesViewType.consumerLatency.label}</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MessagingQueues;
