import { Button, Tabs, TabsProps } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import Spinner from 'components/Spinner';
import CloudServiceDashboards from 'container/CloudIntegrationPage/ServicesSection/CloudServiceDashboards';
import CloudServiceDataCollected from 'container/CloudIntegrationPage/ServicesSection/CloudServiceDataCollected';
import { IServiceStatus } from 'container/CloudIntegrationPage/ServicesSection/types';
import dayjs from 'dayjs';
import { useServiceDetails } from 'hooks/integration/aws/useServiceDetails';
import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect, useMemo, useState } from 'react';

import logEvent from '../../../api/common/logEvent';
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
	serviceStatus: IServiceStatus | undefined;
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

function getTabItems(serviceDetailsData: any): TabsProps['items'] {
	const dashboards = serviceDetailsData?.assets.dashboards || [];
	const dataCollected = serviceDetailsData?.data_collected || {};
	const items: TabsProps['items'] = [];

	if (dashboards.length) {
		items.push({
			key: 'dashboards',
			label: `Dashboards (${dashboards.length})`,
			children: <CloudServiceDashboards service={serviceDetailsData} />,
		});
	}

	items.push({
		key: 'data-collected',
		label: 'Data Collected',
		children: (
			<CloudServiceDataCollected
				logsData={dataCollected.logs || []}
				metricsData={dataCollected.metrics || []}
			/>
		),
	});

	return items;
}

function ServiceDetails(): JSX.Element | null {
	const urlQuery = useUrlQuery();
	const cloudAccountId = urlQuery.get('cloudAccountId');
	const serviceId = urlQuery.get('service');
	const [isConfigureServiceModalOpen, setIsConfigureServiceModalOpen] = useState(
		false,
	);
	const openServiceConfigModal = (): void => {
		setIsConfigureServiceModalOpen(true);
		logEvent('AWS Integration: Service settings viewed', {
			cloudAccountId,
			serviceId,
		});
	};

	const { data: serviceDetailsData, isLoading } = useServiceDetails(
		serviceId || '',
		cloudAccountId || undefined,
	);

	// eslint-disable-next-line @typescript-eslint/naming-convention
	const { config, supported_signals } = serviceDetailsData ?? {};

	const totalSupportedSignals = Object.entries(supported_signals || {}).filter(
		([, value]) => !!value,
	).length;
	const enabledSignals = useMemo(
		() =>
			Object.values(config || {}).filter((item) => item && item.enabled).length,
		[config],
	);

	const isAnySignalConfigured = useMemo(
		() => !!config?.logs?.enabled || !!config?.metrics?.enabled,
		[config],
	);

	// log telemetry event on visiting details of a service.
	useEffect(() => {
		if (serviceId) {
			logEvent('AWS Integration: Service viewed', {
				cloudAccountId,
				serviceId,
			});
		}
	}, [cloudAccountId, serviceId]);

	if (isLoading) {
		return <Spinner size="large" height="50vh" />;
	}

	if (!serviceDetailsData) {
		return null;
	}

	const tabItems = getTabItems(serviceDetailsData);

	return (
		<div className="service-details">
			<div className="service-details__title-bar">
				<div className="service-details__details-title">Details</div>
				<div className="service-details__right-actions">
					{isAnySignalConfigured && (
						<ServiceStatus serviceStatus={serviceDetailsData.status} />
					)}

					{!!cloudAccountId &&
						(isAnySignalConfigured ? (
							<Button
								className="configure-button configure-button--default"
								onClick={openServiceConfigModal}
							>
								Configure ({enabledSignals}/{totalSupportedSignals})
							</Button>
						) : (
							<Button
								type="primary"
								className="configure-button configure-button--primary"
								onClick={openServiceConfigModal}
							>
								Enable Service
							</Button>
						))}
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
			{isConfigureServiceModalOpen && (
				<ConfigureServiceModal
					isOpen
					onClose={(): void => setIsConfigureServiceModalOpen(false)}
					serviceName={serviceDetailsData.title}
					serviceId={serviceId || ''}
					cloudAccountId={cloudAccountId || ''}
					initialConfig={serviceDetailsData.config}
					supportedSignals={serviceDetailsData.supported_signals || {}}
				/>
			)}
		</div>
	);
}

export default ServiceDetails;
