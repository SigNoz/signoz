import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/button';
import Tabs from '@signozhq/tabs';
import { toast } from '@signozhq/ui';
import { Switch } from '@signozhq/ui';
import { Skeleton } from 'antd';
import logEvent from 'api/common/logEvent';
import {
	getListServicesMetadataQueryKey,
	invalidateGetService,
	invalidateListServicesMetadata,
	useGetService,
	useUpdateService,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesServiceDTO,
	ListServicesMetadata200,
} from 'api/generated/services/sigNoz.schemas';
import CloudServiceDataCollected from 'components/CloudIntegrations/CloudServiceDataCollected/CloudServiceDataCollected';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import ServiceDashboards from 'container/Integrations/CloudIntegration/AmazonWebServices/ServiceDashboards/ServiceDashboards';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { IServiceStatus } from 'container/Integrations/types';
import useUrlQuery from 'hooks/useUrlQuery';
import { Save, X } from 'lucide-react';

import S3BucketsSelector from '../S3BucketsSelector/S3BucketsSelector';

import './ServiceDetails.styles.scss';

type ServiceConfigFormValues = {
	logsEnabled: boolean;
	metricsEnabled: boolean;
	s3BucketsByRegion: Record<string, string[]>;
};
type ServiceDetailsData = CloudintegrationtypesServiceDTO & {
	status?: IServiceStatus;
};

function ServiceDetails(): JSX.Element | null {
	const urlQuery = useUrlQuery();
	const cloudAccountId = urlQuery.get('cloudAccountId');
	const serviceId = urlQuery.get('service');
	const isReadOnly = !cloudAccountId;
	const serviceQueryParams = cloudAccountId
		? { cloud_integration_id: cloudAccountId }
		: undefined;

	const {
		queryKey: _queryKey,
		data: serviceDetailsData,
		isLoading: isServiceDetailsLoading,
	} = useGetService(
		{
			cloudProvider: INTEGRATION_TYPES.AWS,
			serviceId: serviceId || '',
		},
		{
			...serviceQueryParams,
		},
		{
			query: {
				enabled: !!serviceId,
				select: (response): ServiceDetailsData => response.data,
			},
		},
	);

	const awsConfig = serviceDetailsData?.cloudIntegrationService?.config?.aws;
	const isServiceEnabledInPersistedConfig =
		Boolean(awsConfig?.logs?.enabled) || Boolean(awsConfig?.metrics?.enabled);
	const serviceDetailsId = serviceDetailsData?.id;

	const {
		control,
		handleSubmit: handleFormSubmit,
		reset,
		watch,
		formState: { isDirty },
	} = useForm<ServiceConfigFormValues>({
		defaultValues: {
			logsEnabled: awsConfig?.logs?.enabled || false,
			metricsEnabled: awsConfig?.metrics?.enabled || false,
			s3BucketsByRegion: awsConfig?.logs?.s3Buckets || {},
		},
	});

	const resetToAwsConfig = useCallback((): void => {
		reset({
			logsEnabled: awsConfig?.logs?.enabled || false,
			metricsEnabled: awsConfig?.metrics?.enabled || false,
			s3BucketsByRegion: awsConfig?.logs?.s3Buckets || {},
		});
	}, [awsConfig, reset]);

	// Ensure form state does not leak across service switches while new details load.
	useEffect(() => {
		reset({
			logsEnabled: false,
			metricsEnabled: false,
			s3BucketsByRegion: {},
		});
	}, [reset, serviceId]);

	useEffect(() => {
		resetToAwsConfig();
	}, [resetToAwsConfig, serviceDetailsId]);

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
		mutate: updateService,
		isLoading: isUpdatingServiceConfig,
	} = useUpdateService();

	const queryClient = useQueryClient();

	const handleDiscard = useCallback((): void => {
		resetToAwsConfig();
	}, [resetToAwsConfig]);

	const onSubmit = useCallback(
		async (values: ServiceConfigFormValues): Promise<void> => {
			const { logsEnabled, metricsEnabled, s3BucketsByRegion } = values;
			const shouldClearS3Buckets = serviceId === 's3sync' && !logsEnabled;
			const normalizedS3BucketsByRegion = shouldClearS3Buckets
				? {}
				: s3BucketsByRegion;
			const nextFormValues: ServiceConfigFormValues = {
				...values,
				s3BucketsByRegion: normalizedS3BucketsByRegion,
			};

			try {
				if (!serviceId || !cloudAccountId) {
					return;
				}

				updateService(
					{
						pathParams: {
							cloudProvider: INTEGRATION_TYPES.AWS,
							id: cloudAccountId,
							serviceId,
						},
						data: {
							config: {
								aws: {
									logs: {
										enabled: logsEnabled,
										s3Buckets: normalizedS3BucketsByRegion,
									},
									metrics: {
										enabled: metricsEnabled,
									},
								},
							},
						},
					},
					{
						onSuccess: () => {
							// Immediately sync form state to remove dirty flag and hide actions,
							// instead of waiting for the refetch to complete.
							reset(nextFormValues);

							const servicesListQueryKey = getListServicesMetadataQueryKey(
								{
									cloudProvider: INTEGRATION_TYPES.AWS,
								},
								{
									cloud_integration_id: cloudAccountId,
								},
							);

							queryClient.setQueryData<ListServicesMetadata200 | undefined>(
								servicesListQueryKey,
								(prev) => {
									if (!prev?.data?.services?.length) {
										return prev;
									}

									const isServiceEnabled = logsEnabled || metricsEnabled;

									return {
										...prev,
										data: {
											...prev.data,
											services: prev.data.services.map((service) =>
												service.id === serviceId
													? { ...service, enabled: isServiceEnabled }
													: service,
											),
										},
									};
								},
							);

							invalidateGetService(
								queryClient,
								{
									cloudProvider: INTEGRATION_TYPES.AWS,
									serviceId,
								},
								{
									cloud_integration_id: cloudAccountId,
								},
							);

							invalidateListServicesMetadata(
								queryClient,
								{
									cloudProvider: INTEGRATION_TYPES.AWS,
								},
								{
									cloud_integration_id: cloudAccountId,
								},
							);

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
		},
		[serviceId, cloudAccountId, updateService, queryClient, reset],
	);

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

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const renderOverview = (): JSX.Element => {
		const logsEnabled = watch('logsEnabled');
		const s3BucketsByRegion = watch('s3BucketsByRegion');

		const isLogsSupported = serviceDetailsData?.supportedSignals?.logs || false;
		const isMetricsSupported =
			serviceDetailsData?.supportedSignals?.metrics || false;

		const hasUnsavedChanges = isDirty;

		const isS3SyncBucketsMissing =
			serviceId === 's3sync' &&
			logsEnabled &&
			(!s3BucketsByRegion || Object.keys(s3BucketsByRegion).length === 0);

		return (
			<div className="aws-service-details-overview ">
				{!isServiceDetailsLoading && (
					<form
						className="aws-service-details-overview-configuration"
						onSubmit={handleFormSubmit(onSubmit)}
					>
						{isLogsSupported && (
							<div className="aws-service-details-overview-configuration-logs">
								<div className="aws-service-details-overview-configuration-title">
									<div className="aws-service-details-overview-configuration-title-text">
										<span>Log Collection</span>
									</div>
									<div className="configuration-action">
										<Controller<ServiceConfigFormValues, 'logsEnabled'>
											control={control}
											name="logsEnabled"
											render={({ field }): JSX.Element => (
												<Switch
													value={field.value}
													disabled={isUpdatingServiceConfig || isReadOnly}
													onChange={(checked): void => {
														field.onChange(checked);
													}}
												/>
											)}
										/>
									</div>
								</div>

								{logsEnabled && serviceId === 's3sync' && (
									<div className="aws-service-details-overview-configuration-s3-buckets">
										<Controller<ServiceConfigFormValues, 's3BucketsByRegion'>
											control={control}
											name="s3BucketsByRegion"
											render={({ field }): JSX.Element => (
												<S3BucketsSelector
													initialBucketsByRegion={field.value}
													onChange={field.onChange}
													disabled={isReadOnly}
												/>
											)}
										/>
									</div>
								)}
							</div>
						)}

						{isMetricsSupported && (
							<div className="aws-service-details-overview-configuration-metrics">
								<div className="aws-service-details-overview-configuration-title">
									<div className="aws-service-details-overview-configuration-title-text">
										<span>Metric Collection</span>
									</div>
									<div className="configuration-action">
										<Controller<ServiceConfigFormValues, 'metricsEnabled'>
											control={control}
											name="metricsEnabled"
											render={({ field }): JSX.Element => (
												<Switch
													value={field.value}
													disabled={isUpdatingServiceConfig || isReadOnly}
													onChange={field.onChange}
												/>
											)}
										/>
									</div>
								</div>
							</div>
						)}

						{hasUnsavedChanges && !isReadOnly && (
							<div className="aws-service-details-overview-configuration-actions">
								<Button
									variant="solid"
									color="secondary"
									onClick={handleDiscard}
									disabled={isUpdatingServiceConfig}
									size="xs"
									prefixIcon={<X size={14} />}
									className="discard-btn"
									type="button"
								>
									Discard
								</Button>
								<Button
									variant="solid"
									color="primary"
									size="xs"
									className="save-btn"
									prefixIcon={<Save size={14} />}
									type="submit"
									loading={isUpdatingServiceConfig}
									disabled={isS3SyncBucketsMissing || isUpdatingServiceConfig}
								>
									Save
								</Button>
							</div>
						)}
					</form>
				)}

				<MarkdownRenderer
					variables={{}}
					markdownContent={serviceDetailsData?.overview}
					className="aws-service-details-overview-markdown"
				/>
				<ServiceDashboards
					service={serviceDetailsData}
					isInteractive={!isReadOnly && isServiceEnabledInPersistedConfig}
				/>
			</div>
		);
	};

	const renderDataCollected = (): JSX.Element => {
		return (
			<div className="aws-service-details-data-collected-table">
				<CloudServiceDataCollected
					logsData={serviceDetailsData?.dataCollected?.logs || []}
					metricsData={serviceDetailsData?.dataCollected?.metrics || []}
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
