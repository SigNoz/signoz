import './MessagingQueues.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Modal } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Calendar, ListMinus } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { isCloudUser } from 'utils/app';

import {
	KAFKA_SETUP_DOC_LINK,
	MessagingQueuesViewType,
} from './MessagingQueuesUtils';
import { ComingSoon } from './MQCommon/MQCommon';

function MessagingQueues(): JSX.Element {
	const history = useHistory();
	const { t } = useTranslation('messagingQueuesKafkaOverview');

	const { confirm } = Modal;

	const showConfirm = (): void => {
		logEvent('Messaging Queues: View details clicked', {
			page: 'Messaging Queues Overview',
			source: 'Consumer Latency view',
		});

		confirm({
			icon: <ExclamationCircleFilled />,
			content: t('confirmModal.content'),
			className: 'overview-confirm-modal',
			onOk() {
				logEvent('Messaging Queues: Proceed button clicked', {
					page: 'Messaging Queues Overview',
				});
				history.push(ROUTES.MESSAGING_QUEUES_DETAIL);
			},
			okText: t('confirmModal.okText'),
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
				{t('breadcrumb')}
			</div>
			<div className="messaging-header">
				<div className="header-config">{t('header')}</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className="messaging-overview">
				<p className="overview-text">{t('overview.title')}</p>
				<p className="overview-subtext">{t('overview.subtitle')}</p>
				<div className="overview-doc-area">
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('configureConsumer.title')}</p>
							<p className="card-info-text">{t('configureConsumer.description')}</p>
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
								{t('configureConsumer.button')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card middle-card">
						<div>
							<p className="card-title">{t('configureProducer.title')}</p>
							<p className="card-info-text">{t('configureProducer.description')}</p>
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
								{t('configureProducer.button')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('monitorKafka.title')}</p>
							<p className="card-info-text">{t('monitorKafka.description')}</p>
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
								{t('monitorKafka.button')}
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
								{t('summarySection.viewDetailsButton')}
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
