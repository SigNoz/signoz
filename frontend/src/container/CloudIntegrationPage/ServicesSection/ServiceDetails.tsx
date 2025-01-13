import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, TabsProps } from 'antd';
import dayjs from 'dayjs';
import { Wrench } from 'lucide-react';

import CloudServiceDashboards from './CloudServiceDashboards';
import CloudServiceDataCollected from './CloudServiceDataCollected';
import { IServiceStatus, ServiceData } from './types';

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

function ServiceDetails({ service }: { service: ServiceData }): JSX.Element {
	const tabItems: TabsProps['items'] = [
		{
			key: 'dashboards',
			label: `Dashboards (${service.assets.dashboards.length})`,
			children: <CloudServiceDashboards service={service} />,
		},
		{
			key: 'data-collected',
			label: 'Data Collected',
			children: (
				<CloudServiceDataCollected
					logsData={service.data_collected.logs || []}
					metricsData={service.data_collected.metrics || []}
				/>
			),
		},
	];

	return (
		<div className="service-details">
			<div className="service-details__title-bar">
				<div className="service-details__details-title">Details</div>
				<div className="service-details__right-actions">
					{service.status && <ServiceStatus serviceStatus={service.status} />}
					<Button className="configure-button">
						<Wrench size={12} color={Color.BG_VANILLA_400} />
						Configure
					</Button>
				</div>
			</div>
			<div className="service-details__overview">{service.overview}</div>
			<div className="service-details__tabs">
				<Tabs items={tabItems} />
			</div>
		</div>
	);
}

export default ServiceDetails;
