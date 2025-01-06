import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, TabsProps } from 'antd';
import { Wrench } from 'lucide-react';

import CloudServiceDashboards from './CloudServiceDashboards';
import CloudServiceDataCollected from './CloudServiceDataCollected';
import { ServiceData } from './types';

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
