import Tabs from '@signozhq/tabs';
import { Skeleton } from 'antd';
import CloudServiceDataCollected from 'components/CloudIntegrations/CloudServiceDataCollected/CloudServiceDataCollected';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { AzureService } from 'container/Integrations/types';
import { useGetCloudIntegrationServiceDetails } from 'hooks/integration/useServiceDetails';

import './AzureServiceDetails.styles.scss';

interface AzureServiceDetailsProps {
	selectedService: AzureService | null;
	cloudAccountId: string;
}

export default function AzureServiceDetails({
	selectedService,
	cloudAccountId,
}: AzureServiceDetailsProps): JSX.Element {
	const {
		data: serviceDetailsData,
		isLoading,
	} = useGetCloudIntegrationServiceDetails(
		INTEGRATION_TYPES.AZURE,
		selectedService?.id || '',
		cloudAccountId || undefined,
	);

	const renderOverview = (): JSX.Element => {
		const dashboards = serviceDetailsData?.assets?.dashboards || [];

		if (isLoading) {
			return (
				<div className="azure-service-details-overview-loading">
					<Skeleton active />
				</div>
			);
		}

		return (
			<div className="azure-service-details-overview">
				<MarkdownRenderer
					variables={{}}
					markdownContent={serviceDetailsData?.overview}
				/>

				<div className="azure-service-dashboards">
					<div className="azure-service-dashboards-title">Dashboards</div>
					<div className="azure-service-dashboards-items">
						{dashboards.map((dashboard) => (
							<div key={dashboard.id} className="azure-service-dashboard-item">
								<div className="azure-service-dashboard-item-title">
									{dashboard.title}
								</div>
								<div className="azure-service-dashboard-item-description">
									{dashboard.description}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	};

	const renderDataCollected = (): JSX.Element => {
		return (
			<div className="azure-service-details-data-collected-table">
				<CloudServiceDataCollected
					logsData={serviceDetailsData?.data_collected?.logs || []}
					metricsData={serviceDetailsData?.data_collected?.metrics || []}
				/>
			</div>
		);
	};

	return (
		<div className="azure-service-details-container">
			<Tabs
				defaultValue="overview"
				className="azure-service-details-tabs"
				items={[
					{
						children: renderOverview(),
						key: 'overview',
						label: 'Overview',
					},
					{
						children: renderDataCollected(),
						key: 'data-collected',
						label: 'Data Collected',
					},
				]}
				variant="secondary"
			/>
		</div>
	);
}
