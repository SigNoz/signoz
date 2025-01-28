import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, TabsProps } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Spinner from 'components/Spinner';
import CloudServiceDashboards from 'container/CloudIntegrationPage/ServicesSection/CloudServiceDashboards';
import CloudServiceDataCollected from 'container/CloudIntegrationPage/ServicesSection/CloudServiceDataCollected';
import { IServiceStatus } from 'container/CloudIntegrationPage/ServicesSection/types';
import dayjs from 'dayjs';
import { useServiceDetails } from 'hooks/integrations/aws/useServiceDetails';
import useUrlQuery from 'hooks/useUrlQuery';
import { Wrench } from 'lucide-react';
import { useState } from 'react';

import ConfigureServiceModal from './ConfigureServiceModal';

const getStatus = (
	logsLastReceivedTimestamp: number | undefined,
	metricsLastReceivedTimestamp: number | undefined,
): { text: string; className: string } => {
	if (!logsLastReceivedTimestamp && !metricsLastReceivedTimestamp) {
		return { text: 'No Data Yet', className: 'service-status--no-data' };
	}

	const latestTimestamp = Math.max(
		logsLastReceivedTimestamp || 0,
		metricsLastReceivedTimestamp || 0,
	);

	const isStale = dayjs().diff(dayjs(latestTimestamp), 'minute') > 30;

	if (isStale) {
		return { text: 'Stale Data', className: 'service-status--stale-data' };
	}

	return { text: 'Connected', className: 'service-status--connected' };
};

function ServiceStatus({
	serviceStatus,
}: {
	serviceStatus: IServiceStatus | null;
}): JSX.Element {
	const logsLastReceivedTimestamp = serviceStatus?.logs?.last_received_ts_ms;
	const metricsLastReceivedTimestamp =
		serviceStatus?.metrics?.last_received_ts_ms;

	const { text, className } = getStatus(
		logsLastReceivedTimestamp,
		metricsLastReceivedTimestamp,
	);

	return <div className={`service-status ${className}`}>{text}</div>;
}

function ServiceDetails(): JSX.Element | null {
	const urlQuery = useUrlQuery();
	const accountId = urlQuery.get('accountId');
	const serviceId = urlQuery.get('service');
	const [isConfigureServiceModalOpen, setIsConfigureServiceModalOpen] = useState(
		false,
	);

	const { data: serviceDetailsData, isLoading } = useServiceDetails(
		serviceId || '',
		accountId || undefined,
	);

	if (isLoading) {
		return <Spinner size="large" height="50vh" />;
	}

	if (!serviceDetailsData) {
		return null;
	}

	const tabItems: TabsProps['items'] = [
		{
			key: 'dashboards',
			label: `Dashboards (${serviceDetailsData?.assets.dashboards.length})`,
			children: <CloudServiceDashboards service={serviceDetailsData} />,
		},
		{
			key: 'data-collected',
			label: 'Data Collected',
			children: (
				<CloudServiceDataCollected
					logsData={serviceDetailsData?.data_collected.logs || []}
					metricsData={serviceDetailsData?.data_collected.metrics || []}
				/>
			),
		},
	];

	return (
		<div className="service-details">
			<div className="service-details__title-bar">
				<div className="service-details__details-title">Details</div>
				<div className="service-details__right-actions">
					{serviceDetailsData?.status && (
						<ServiceStatus serviceStatus={serviceDetailsData.status} />
					)}
					{!!accountId && (
						<Button
							className="configure-button"
							onClick={(): void => setIsConfigureServiceModalOpen(true)}
						>
							<Wrench size={12} color={Color.BG_VANILLA_400} />
							Configure
						</Button>
					)}
				</div>
			</div>
			<div className="service-details__overview">
				<MarkdownRenderer
					variables={{}}
					markdownContent={serviceDetailsData?.overview}
				/>
			</div>
			<div className="service-details__tabs">
				<Tabs items={tabItems} />
			</div>
			<ConfigureServiceModal
				isOpen={isConfigureServiceModalOpen}
				onClose={(): void => setIsConfigureServiceModalOpen(false)}
				serviceName={serviceDetailsData.title}
				serviceId={serviceId || ''}
				cloudAccountId={accountId || ''}
				initialConfig={serviceDetailsData.config}
				supportedSignals={serviceDetailsData.supported_signals || {}}
			/>
		</div>
	);
}

export default ServiceDetails;
