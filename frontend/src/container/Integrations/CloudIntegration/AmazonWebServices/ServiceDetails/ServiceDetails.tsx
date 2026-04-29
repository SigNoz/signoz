import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { Button, Switch, Tabs, toast } from '@signozhq/ui';
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
	CloudintegrationtypesServiceConfigDTO,
	CloudintegrationtypesServiceDTO,
	ListServicesMetadata200,
} from 'api/generated/services/sigNoz.schemas';
import CloudServiceDataCollected from 'components/CloudIntegrations/CloudServiceDataCollected/CloudServiceDataCollected';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import ServiceDashboards from 'container/Integrations/CloudIntegration/ServiceDashboards/ServiceDashboards';
import { IntegrationType, IServiceStatus } from 'container/Integrations/types';
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

const EMPTY_FORM_VALUES: ServiceConfigFormValues = {
	logsEnabled: false,
	metricsEnabled: false,
	s3BucketsByRegion: {},
};

function getInitialFormValues(
	type: IntegrationType,
	serviceDetailsData?: ServiceDetailsData,
): ServiceConfigFormValues {
	const integrationConfig =
		type === IntegrationType.AWS_SERVICES
			? serviceDetailsData?.cloudIntegrationService?.config?.aws
			: serviceDetailsData?.cloudIntegrationService?.config?.azure;

	return {
		logsEnabled: integrationConfig?.logs?.enabled || false,
		metricsEnabled: integrationConfig?.metrics?.enabled || false,
		s3BucketsByRegion:
			type === IntegrationType.AWS_SERVICES
				? serviceDetailsData?.cloudIntegrationService?.config?.aws?.logs
						?.s3Buckets || {}
				: {},
	};
}

function getServiceConfigPayload({
	type,
	serviceId,
	logsEnabled,
	metricsEnabled,
	isLogsSupported,
	isMetricsSupported,
	s3BucketsByRegion,
}: {
	type: IntegrationType;
	serviceId: string;
	logsEnabled: boolean;
	metricsEnabled: boolean;
	isLogsSupported: boolean;
	isMetricsSupported: boolean;
	s3BucketsByRegion: Record<string, string[]>;
}): CloudintegrationtypesServiceConfigDTO {
	if (type === IntegrationType.AWS_SERVICES) {
		return {
			aws: {
				logs: {
					enabled: isLogsSupported ? logsEnabled : false,
					s3Buckets:
						serviceId === 's3sync' && isLogsSupported ? s3BucketsByRegion : {},
				},
				metrics: {
					enabled: isMetricsSupported ? metricsEnabled : false,
				},
			},
		};
	}

	return {
		azure: {
			logs: {
				enabled: isLogsSupported ? logsEnabled : false,
			},
			metrics: {
				enabled: isMetricsSupported ? metricsEnabled : false,
			},
		},
	};
}

function ServiceDetails({
	type,
}: {
	type: IntegrationType;
}): JSX.Element | null {
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
			cloudProvider: type,
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

	const integrationConfig =
		type === IntegrationType.AWS_SERVICES
			? serviceDetailsData?.cloudIntegrationService?.config?.aws
			: serviceDetailsData?.cloudIntegrationService?.config?.azure;
	const isServiceEnabledInPersistedConfig =
		Boolean(integrationConfig?.logs?.enabled) ||
		Boolean(integrationConfig?.metrics?.enabled);
	const serviceDetailsId = serviceDetailsData?.id;
	const isLogsSupported = serviceDetailsData?.supportedSignals?.logs || false;
	const isMetricsSupported =
		serviceDetailsData?.supportedSignals?.metrics || false;

	const {
		control,
		handleSubmit: handleFormSubmit,
		reset,
		watch,
		formState: { isDirty },
	} = useForm<ServiceConfigFormValues>({
		defaultValues: getInitialFormValues(type, serviceDetailsData),
	});

	const resetToConfig = useCallback((): void => {
		reset(getInitialFormValues(type, serviceDetailsData));
	}, [reset, serviceDetailsData, type]);

	// Ensure form state does not leak across service switches while new details load.
	useEffect(() => {
		reset(EMPTY_FORM_VALUES);
	}, [reset, serviceId]);

	useEffect(() => {
		resetToConfig();
	}, [resetToConfig, serviceDetailsId]);

	// log telemetry event on visiting details of a service.
	useEffect(() => {
		if (serviceId) {
			logEvent(`${type} Integration: Service viewed`, {
				cloudAccountId,
				serviceId,
			});
		}
	}, [cloudAccountId, serviceId, type]);

	const { mutate: updateService, isLoading: isUpdatingServiceConfig } =
		useUpdateService();

	const queryClient = useQueryClient();

	const handleDiscard = useCallback((): void => {
		resetToConfig();
	}, [resetToConfig]);

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

				const serviceConfigPayload = getServiceConfigPayload({
					type,
					serviceId,
					logsEnabled,
					metricsEnabled,
					isLogsSupported,
					isMetricsSupported,
					s3BucketsByRegion: normalizedS3BucketsByRegion,
				});

				updateService(
					{
						pathParams: {
							cloudProvider: type,
							id: cloudAccountId,
							serviceId,
						},
						data: {
							config: serviceConfigPayload,
						},
					},
					{
						onSuccess: () => {
							// Immediately sync form state to remove dirty flag and hide actions,
							// instead of waiting for the refetch to complete.
							reset(nextFormValues);

							const servicesListQueryKey = getListServicesMetadataQueryKey(
								{
									cloudProvider: type,
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
									cloudProvider: type,
									serviceId,
								},
								{
									cloud_integration_id: cloudAccountId,
								},
							);

							invalidateListServicesMetadata(
								queryClient,
								{
									cloudProvider: type,
								},
								{
									cloud_integration_id: cloudAccountId,
								},
							);

							logEvent(`${type} Integration: Service settings saved`, {
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
		[
			serviceId,
			cloudAccountId,
			updateService,
			queryClient,
			reset,
			type,
			isLogsSupported,
			isMetricsSupported,
		],
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
									size="sm"
									prefix={<X size={14} />}
									className="discard-btn"
									type="button"
								>
									Discard
								</Button>
								<Button
									variant="solid"
									color="primary"
									size="sm"
									className="save-btn"
									prefix={<Save size={14} />}
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
