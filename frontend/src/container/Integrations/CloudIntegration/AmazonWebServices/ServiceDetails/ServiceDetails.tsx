import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { toast } from '@signozhq/sonner';
import { Switch } from '@signozhq/switch';
import Tabs from '@signozhq/tabs';
import { Popover, Skeleton } from 'antd';
import logEvent from 'api/common/logEvent';
import CloudServiceDataCollected from 'components/CloudIntegrations/CloudServiceDataCollected/CloudServiceDataCollected';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ServiceDashboards from 'container/Integrations/CloudIntegration/AmazonWebServices/ServiceDashboards/ServiceDashboards';
import { AWSServiceConfig } from 'container/Integrations/CloudIntegration/AmazonWebServices/types';
import { useServiceDetails } from 'hooks/integration/aws/useServiceDetails';
import { useUpdateServiceConfig } from 'hooks/integration/aws/useUpdateServiceConfig';
import useUrlQuery from 'hooks/useUrlQuery';
import { CheckCircle, Save, TriangleAlert, X } from 'lucide-react';

import { ConfigConnectionStatus } from '../../ConfigConnectionStatus/ConfigConnectionStatus';
import S3BucketsSelector from '../S3BucketsSelector/S3BucketsSelector';

import './ServiceDetails.styles.scss';

function ServiceDetails(): JSX.Element | null {
	const urlQuery = useUrlQuery();
	const cloudAccountId = urlQuery.get('cloudAccountId');
	const serviceId = urlQuery.get('service');

	const [logsEnabled, setLogsEnabled] = useState(false);
	const [metricsEnabled, setMetricsEnabled] = useState(false);
	const [s3BucketsByRegion, setS3BucketsByRegion] = useState<
		Record<string, string[]>
	>({});

	const {
		data: serviceDetailsData,
		isLoading: isServiceDetailsLoading,
	} = useServiceDetails(serviceId || '', cloudAccountId || undefined);

	// eslint-disable-next-line @typescript-eslint/naming-convention
	const { config } = serviceDetailsData ?? {};

	const awsConfig = config as AWSServiceConfig | undefined;

	const setToInitialState = useCallback((): void => {
		setLogsEnabled(awsConfig?.logs?.enabled || false);
		setMetricsEnabled(awsConfig?.metrics?.enabled || false);
		setS3BucketsByRegion(awsConfig?.logs?.s3_buckets || {});
	}, [awsConfig]);

	useEffect(() => {
		setToInitialState();
	}, [awsConfig, setToInitialState]);

	// log telemetry event on visiting details of a service.
	useEffect(() => {
		if (serviceId) {
			logEvent('AWS Integration: Service viewed', {
				cloudAccountId,
				serviceId,
			});
		}
	}, [cloudAccountId, serviceId]);

	const {
		mutate: updateServiceConfig,
		isLoading: isUpdatingServiceConfig,
	} = useUpdateServiceConfig();

	const queryClient = useQueryClient();

	const handleDiscard = useCallback((): void => {
		setToInitialState();
	}, [setToInitialState]);

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			if (!serviceId || !cloudAccountId) {
				return;
			}

			updateServiceConfig(
				{
					serviceId,
					payload: {
						cloud_account_id: cloudAccountId,
						config: {
							logs: {
								enabled: logsEnabled,
								s3_buckets: s3BucketsByRegion,
							},
							metrics: {
								enabled: metricsEnabled,
							},
						},
					},
				},
				{
					onSuccess: () => {
						queryClient.invalidateQueries([
							REACT_QUERY_KEY.AWS_SERVICE_DETAILS,
							serviceId,
						]);

						logEvent('AWS Integration: Service settings saved', {
							cloudAccountId,
							serviceId,
							logsEnabled,
							metricsEnabled,
						});
					},
					onError: (error) => {
						console.error('Failed to update service config:', error);

						toast.error('Failed to update service config', {
							description: error?.message,
						});
					},
				},
			);
		} catch (error) {
			console.error('Form submission failed:', error);
		}
	}, [
		serviceId,
		cloudAccountId,
		updateServiceConfig,
		logsEnabled,
		metricsEnabled,
		queryClient,
		s3BucketsByRegion,
	]);

	if (isServiceDetailsLoading) {
		return (
			<div className="service-details-loading">
				<Skeleton active />
				<Skeleton active />
			</div>
		);
	}

	if (!serviceDetailsData) {
		return null;
	}

	const handleS3BucketsChange = (
		bucketsByRegion: Record<string, string[]>,
	): void => {
		setS3BucketsByRegion(bucketsByRegion);
	};

	const renderOverview = (): JSX.Element => {
		const isLogsSupported = serviceDetailsData?.supported_signals?.logs || false;
		const isMetricsSupported =
			serviceDetailsData?.supported_signals?.metrics || false;

		const logsStatus = serviceDetailsData?.status?.logs || null;
		const metricsStatus = serviceDetailsData?.status?.metrics || null;

		const logsConnectionStatus = logsStatus?.find(
			(log) => log.last_received_ts_ms > 0,
		);

		const metricsConnectionStatus = metricsStatus?.find(
			(metric) => metric.last_received_ts_ms > 0,
		);

		return (
			<div className="aws-service-details-overview ">
				{!isServiceDetailsLoading && (
					<div className="aws-service-details-overview-configuration">
						{isLogsSupported && (
							<div className="aws-service-details-overview-configuration-logs">
								<div className="aws-service-details-overview-configuration-title">
									<div className="aws-service-details-overview-configuration-title-text">
										{logsEnabled && (
											<Popover
												content={<ConfigConnectionStatus status={logsStatus} />}
												trigger="hover"
												placement="right"
												overlayClassName="config-connection-status-popover"
											>
												<div className="aws-service-details-overview-configuration-title-text-icon">
													{logsConnectionStatus ? (
														<CheckCircle size={16} color={Color.BG_FOREST_500} />
													) : (
														<TriangleAlert size={16} color={Color.BG_AMBER_500} />
													)}
												</div>
											</Popover>
										)}

										<span>Log Collection</span>
									</div>
									<div className="configuration-action">
										<Switch
											checked={logsEnabled}
											disabled={isUpdatingServiceConfig}
											onCheckedChange={(checked): void => {
												setLogsEnabled(checked);
											}}
										/>
									</div>
								</div>

								{logsEnabled && serviceId === 's3sync' && (
									<div className="aws-service-details-overview-configuration-s3-buckets">
										<S3BucketsSelector
											initialBucketsByRegion={s3BucketsByRegion}
											onChange={handleS3BucketsChange}
										/>
									</div>
								)}
							</div>
						)}

						{isMetricsSupported && (
							<div className="aws-service-details-overview-configuration-metrics">
								<div className="aws-service-details-overview-configuration-title">
									<div className="aws-service-details-overview-configuration-title-text">
										{metricsEnabled && (
											<Popover
												content={<ConfigConnectionStatus status={metricsStatus} />}
												trigger="hover"
												placement="right"
												overlayClassName="config-connection-status-popover"
											>
												<div className="aws-service-details-overview-configuration-title-text-icon">
													{metricsConnectionStatus ? (
														<CheckCircle size={16} color={Color.BG_FOREST_500} />
													) : (
														<TriangleAlert size={16} color={Color.BG_AMBER_500} />
													)}
												</div>
											</Popover>
										)}

										<span>Metric Collection</span>
									</div>
									<div className="configuration-action">
										<Switch
											checked={metricsEnabled}
											disabled={isUpdatingServiceConfig}
											onCheckedChange={(checked): void => {
												setMetricsEnabled(checked);
											}}
										/>
									</div>
								</div>
							</div>
						)}

						<div className="aws-service-details-overview-configuration-actions">
							<Button
								variant="solid"
								color="secondary"
								onClick={handleDiscard}
								loading={isUpdatingServiceConfig}
								disabled={isUpdatingServiceConfig}
								size="xs"
								prefixIcon={<X size={14} />}
							>
								Discard
							</Button>
							<Button
								variant="solid"
								color="primary"
								size="xs"
								prefixIcon={<Save size={14} />}
								onClick={handleSubmit}
								loading={isUpdatingServiceConfig}
							>
								Save
							</Button>
						</div>
					</div>
				)}

				<MarkdownRenderer
					variables={{}}
					markdownContent={serviceDetailsData?.overview}
				/>
				<ServiceDashboards service={serviceDetailsData} />
			</div>
		);
	};

	const renderDataCollected = (): JSX.Element => {
		return (
			<div className="aws-service-details-data-collected-table">
				<CloudServiceDataCollected
					logsData={serviceDetailsData?.data_collected?.logs || []}
					metricsData={serviceDetailsData?.data_collected?.metrics || []}
				/>
			</div>
		);
	};

	return (
		<div className="aws-service-details-container">
			<Tabs
				defaultValue="overview"
				className="aws-service-details-tabs"
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

export default ServiceDetails;
