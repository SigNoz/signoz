import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import Tabs from '@signozhq/tabs';
import { Checkbox, Skeleton } from 'antd';
import CloudServiceDataCollected from 'components/CloudIntegrations/CloudServiceDataCollected/CloudServiceDataCollected';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { AzureConfig, AzureService } from 'container/Integrations/types';
import { useGetCloudIntegrationServiceDetails } from 'hooks/integration/useServiceDetails';
import { useUpdateServiceConfig } from 'hooks/integration/useUpdateServiceConfig';
import { isEqual } from 'lodash-es';
import { Save, X } from 'lucide-react';

import './AzureServiceDetails.styles.scss';

interface AzureServiceDetailsProps {
	selectedService: AzureService | null;
	cloudAccountId: string;
}

function configToMap(
	config: AzureConfig[] | undefined,
): { [key: string]: boolean } {
	return (config || []).reduce(
		(acc: { [key: string]: boolean }, item: AzureConfig) => {
			acc[item.name] = item.enabled;
			return acc;
		},
		{},
	);
}

export default function AzureServiceDetails({
	selectedService,
	cloudAccountId,
}: AzureServiceDetailsProps): JSX.Element {
	const queryClient = useQueryClient();
	const {
		data: serviceDetailsData,
		isLoading,
		refetch: refetchServiceDetails,
	} = useGetCloudIntegrationServiceDetails(
		INTEGRATION_TYPES.AZURE,
		selectedService?.id || '',
		cloudAccountId || undefined,
	);

	const {
		mutate: updateAzureServiceConfig,
		isLoading: isUpdating,
	} = useUpdateServiceConfig();

	// Last saved/committed config — updated when data loads and on save success.
	// Used for hasChanges and Discard so buttons hide immediately after save.
	const [lastSavedSnapshot, setLastSavedSnapshot] = useState<{
		logs: { [key: string]: boolean };
		metrics: { [key: string]: boolean };
	}>({ logs: {}, metrics: {} });

	// Editable state
	const [azureLogsEnabledAll, setAzureLogsEnabledAll] = useState<boolean>(false);
	const [azureMetricsEnabledAll, setAzureMetricsEnabledAll] = useState<boolean>(
		false,
	);
	const [logsConfig, updateLogsConfig] = useState<{ [key: string]: boolean }>(
		{},
	);
	const [metricsConfigs, updateMetricsConfigs] = useState<{
		[key: string]: boolean;
	}>({});

	// Sync state when serviceDetailsData loads
	useEffect(() => {
		if (!serviceDetailsData?.config) {
			return;
		}

		const logs = configToMap(serviceDetailsData.config.logs as AzureConfig[]);
		const metrics = configToMap(
			serviceDetailsData.config.metrics as AzureConfig[],
		);

		if (Object.keys(logs).length > 0) {
			updateLogsConfig(logs);
			setAzureLogsEnabledAll(
				!(serviceDetailsData.config.logs as AzureConfig[])?.some(
					(log: AzureConfig) => !log.enabled,
				),
			);
		}
		if (Object.keys(metrics).length > 0) {
			updateMetricsConfigs(metrics);
			setAzureMetricsEnabledAll(
				!(serviceDetailsData.config.metrics as AzureConfig[])?.some(
					(metric: AzureConfig) => !metric.enabled,
				),
			);
		}

		setLastSavedSnapshot({ logs, metrics });
	}, [serviceDetailsData]);

	const hasChanges =
		!isEqual(logsConfig, lastSavedSnapshot.logs) ||
		!isEqual(metricsConfigs, lastSavedSnapshot.metrics);

	const handleSave = (): void => {
		if (!selectedService?.id) {
			return;
		}

		updateAzureServiceConfig(
			{
				cloudServiceId: INTEGRATION_TYPES.AZURE,
				serviceId: selectedService?.id,
				payload: {
					cloud_account_id: cloudAccountId,
					config: {
						logs: Object.entries(logsConfig).map(([name, enabled]) => ({
							name,
							enabled,
						})),
						metrics: Object.entries(metricsConfigs).map(([name, enabled]) => ({
							name,
							enabled,
						})),
					},
				},
			},
			{
				onSuccess: (_, variables) => {
					// Update snapshot immediately from what we saved (not current state)
					const saved = variables.payload.config;
					setLastSavedSnapshot({
						logs: configToMap(saved.logs),
						metrics: configToMap(saved.metrics),
					});
					queryClient.invalidateQueries([
						REACT_QUERY_KEY.AWS_SERVICE_DETAILS,
						selectedService?.id,
						cloudAccountId,
					]);
					refetchServiceDetails();
				},
			},
		);
	};

	const handleDiscard = (): void => {
		updateLogsConfig(lastSavedSnapshot.logs);
		updateMetricsConfigs(lastSavedSnapshot.metrics);
		setAzureLogsEnabledAll(
			Object.values(lastSavedSnapshot.logs).every(Boolean) &&
				Object.keys(lastSavedSnapshot.logs).length > 0,
		);
		setAzureMetricsEnabledAll(
			Object.values(lastSavedSnapshot.metrics).every(Boolean) &&
				Object.keys(lastSavedSnapshot.metrics).length > 0,
		);
	};

	const handleAzureLogsEnableAllChange = (checked: boolean): void => {
		setAzureLogsEnabledAll(checked);
		updateLogsConfig((prev) =>
			Object.fromEntries(Object.keys(prev).map((key) => [key, checked])),
		);
	};

	const handleAzureMetricsEnableAllChange = (checked: boolean): void => {
		setAzureMetricsEnabledAll(checked);
		updateMetricsConfigs((prev) =>
			Object.fromEntries(Object.keys(prev).map((key) => [key, checked])),
		);
	};

	const handleAzureLogsEnabledChange = (
		logName: string,
		checked: boolean,
	): void => {
		updateLogsConfig((prev) => ({ ...prev, [logName]: checked }));
	};

	const handleAzureMetricsEnabledChange = (
		metricName: string,
		checked: boolean,
	): void => {
		updateMetricsConfigs((prev) => ({ ...prev, [metricName]: checked }));
	};

	// Keep "enable all" in sync when individual items change
	useEffect(() => {
		if (Object.keys(logsConfig).length > 0) {
			const allEnabled = Object.values(logsConfig).every(Boolean);
			setAzureLogsEnabledAll(allEnabled);
		}
	}, [logsConfig]);
	useEffect(() => {
		if (Object.keys(metricsConfigs).length > 0) {
			const allEnabled = Object.values(metricsConfigs).every(Boolean);
			setAzureMetricsEnabledAll(allEnabled);
		}
	}, [metricsConfigs]);

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
				{!isLoading && (
					<div className="azure-service-details-overview-configuration">
						<div className="azure-service-details-overview-configuration-logs">
							<div className="azure-service-details-overview-configuration-title">
								<div className="azure-service-details-overview-configuration-title-text">
									Azure Logs
								</div>
								<div className="configuration-action">
									<Checkbox
										checked={azureLogsEnabledAll}
										indeterminate={
											Object.values(logsConfig).some(Boolean) &&
											!Object.values(logsConfig).every(Boolean)
										}
										onChange={(e): void =>
											handleAzureLogsEnableAllChange(e.target.checked)
										}
										disabled={isUpdating}
									/>
								</div>
							</div>

							<div className="azure-service-details-overview-configuration-content">
								{logsConfig &&
									Object.keys(logsConfig).length > 0 &&
									Object.keys(logsConfig).map((logName: string) => (
										<div
											key={logName}
											className="azure-service-details-overview-configuration-content-item"
										>
											<div className="azure-service-details-overview-configuration-content-item-text">
												{logName}
											</div>
											<Checkbox
												checked={logsConfig[logName]}
												onChange={(e): void =>
													handleAzureLogsEnabledChange(logName, e.target.checked)
												}
												disabled={isUpdating}
											/>
										</div>
									))}
							</div>
						</div>

						<div className="azure-service-details-overview-configuration-metrics">
							<div className="azure-service-details-overview-configuration-title">
								<div className="azure-service-details-overview-configuration-title-text">
									Azure Metrics
								</div>
								<div className="configuration-action">
									<Checkbox
										checked={azureMetricsEnabledAll}
										indeterminate={
											Object.values(metricsConfigs).some(Boolean) &&
											!Object.values(metricsConfigs).every(Boolean)
										}
										onChange={(e): void =>
											handleAzureMetricsEnableAllChange(e.target.checked)
										}
										disabled={isUpdating}
									/>
								</div>
							</div>

							<div className="azure-service-details-overview-configuration-content">
								{metricsConfigs &&
									Object.keys(metricsConfigs).length > 0 &&
									Object.keys(metricsConfigs).map((metricName: string) => (
										<div
											key={metricName}
											className="azure-service-details-overview-configuration-content-item"
										>
											<div className="azure-service-details-overview-configuration-content-item-text">
												{metricName}
											</div>
											<Checkbox
												checked={metricsConfigs[metricName]}
												onChange={(e): void =>
													handleAzureMetricsEnabledChange(metricName, e.target.checked)
												}
												disabled={isUpdating}
											/>
										</div>
									))}
							</div>
						</div>
						{hasChanges && (
							<div className="azure-service-details-overview-configuration-actions">
								<Button
									variant="solid"
									color="secondary"
									onClick={handleDiscard}
									disabled={isUpdating}
									size="xs"
									prefixIcon={<X size={14} />}
								>
									Discard
								</Button>

								<Button
									variant="solid"
									color="primary"
									onClick={handleSave}
									loading={isUpdating}
									disabled={isUpdating}
									size="xs"
									prefixIcon={<Save size={14} />}
								>
									Save
								</Button>
							</div>
						)}
					</div>
				)}

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
