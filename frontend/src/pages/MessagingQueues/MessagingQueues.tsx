/* eslint-disable sonarjs/no-duplicate-string */
import './MessagingQueues.styles.scss';

import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import MessagingQueueHealthCheck from 'components/MessagingQueueHealthCheck/MessagingQueueHealthCheck';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { isCloudUser } from 'utils/app';

import {
	KAFKA_SETUP_DOC_LINK,
	MessagingQueueHealthCheckService,
	MessagingQueuesViewType,
} from './MessagingQueuesUtils';

function MessagingQueues(): JSX.Element {
	const history = useHistory();
	const { t } = useTranslation('messagingQueuesKafkaOverview');

	const redirectToDetailsPage = (callerView?: string): void => {
		logEvent('Messaging Queues: View details clicked', {
			page: 'Messaging Queues Overview',
			source: callerView,
		});

		history.push(
			`${ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL}?${QueryParams.mqServiceView}=${callerView}`,
		);
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
			<div className="messaging-header">
				<div className="header-config">
					{t('header')} /
					<MessagingQueueHealthCheck
						serviceToInclude={[
							MessagingQueueHealthCheckService.Consumers,
							MessagingQueueHealthCheckService.Producers,
							MessagingQueueHealthCheckService.Kafka,
						]}
					/>
				</div>
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
										`${ROUTES.GET_STARTED_APPLICATION_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Consumers}`,
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
										`${ROUTES.GET_STARTED_APPLICATION_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Producers}`,
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
										`${ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING}?${QueryParams.getStartedSource}=kafka&${QueryParams.getStartedSourceService}=${MessagingQueueHealthCheckService.Kafka}`,
										'Monitor kafka',
									)
								}
							>
								{t('monitorKafka.button')}
							</Button>
						</div>
					</div>
				</div>

				<p className="overview-text">{t('overviewSummarySection.title')}</p>
				<p className="overview-subtext">{t('overviewSummarySection.subtitle')}</p>
				<div className={cx('overview-doc-area', 'summary-section')}>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('summarySection.consumer.title')}</p>
							<p className="card-info-text">
								{t('summarySection.consumer.description')}
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									redirectToDetailsPage(MessagingQueuesViewType.consumerLag.value)
								}
							>
								{t('summarySection.viewDetailsButton')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('summarySection.producer.title')}</p>
							<p className="card-info-text">
								{t('summarySection.producer.description')}
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									redirectToDetailsPage(MessagingQueuesViewType.producerLatency.value)
								}
							>
								{t('summarySection.viewDetailsButton')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('summarySection.partition.title')}</p>
							<p className="card-info-text">
								{t('summarySection.partition.description')}
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									redirectToDetailsPage(MessagingQueuesViewType.partitionLatency.value)
								}
							>
								{t('summarySection.viewDetailsButton')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('summarySection.dropRate.title')}</p>
							<p className="card-info-text">
								{t('summarySection.dropRate.description')}
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									redirectToDetailsPage(MessagingQueuesViewType.dropRate.value)
								}
							>
								{t('summarySection.viewDetailsButton')}
							</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">{t('summarySection.metricPage.title')}</p>
							<p className="card-info-text">
								{t('summarySection.metricPage.description')}
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									redirectToDetailsPage(MessagingQueuesViewType.metricPage.value)
								}
							>
								{t('summarySection.viewDetailsButton')}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MessagingQueues;
