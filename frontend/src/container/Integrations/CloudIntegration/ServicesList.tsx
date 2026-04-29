import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Skeleton } from 'antd';
import { useListServicesMetadata } from 'api/generated/services/cloudintegration';
import type { CloudintegrationtypesServiceMetadataDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { IntegrationType } from 'container/Integrations/types';
import useUrlQuery from 'hooks/useUrlQuery';

import emptyStateIconUrl from '@/assets/Icons/emptyState.svg';

interface ServicesListProps {
	cloudAccountId: string;
	type: IntegrationType;
}

function ServicesList({
	cloudAccountId,
	type,
}: ServicesListProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const hasValidCloudAccountId = Boolean(cloudAccountId);
	const serviceQueryParams = hasValidCloudAccountId
		? { cloud_integration_id: cloudAccountId }
		: undefined;

	const { data: servicesMetadata, isLoading } = useListServicesMetadata(
		{
			cloudProvider: type,
		},
		serviceQueryParams,
	);

	const awsServices = useMemo(
		() => servicesMetadata?.data?.services ?? [],
		[servicesMetadata],
	);

	const activeService = urlQuery.get('service');

	const handleActiveService = useCallback(
		(serviceId: string): void => {
			const latestUrlQuery = new URLSearchParams(window.location.search);
			latestUrlQuery.set('service', serviceId);
			navigate({ search: latestUrlQuery.toString() });
		},
		[navigate],
	);

	const enabledServices = useMemo(
		() => awsServices.filter((service) => service.enabled),
		[awsServices],
	);

	// Derive from enabled to guarantee each service is in exactly one list
	const enabledIds = useMemo(
		() => new Set(enabledServices.map((s) => s.id)),
		[enabledServices],
	);
	const notEnabledServices = useMemo(
		() => awsServices?.filter((s) => !enabledIds.has(s.id)) ?? [],
		[awsServices, enabledIds],
	);

	useEffect(() => {
		const allServices = [...enabledServices, ...notEnabledServices];
		const defaultServiceId =
			enabledServices[0]?.id ?? notEnabledServices[0]?.id ?? null;

		// If a service is already selected and still exists in the refreshed list, keep it
		if (activeService && allServices.some((s) => s.id === activeService)) {
			return;
		}

		// No valid selection — pick a default
		if (defaultServiceId) {
			handleActiveService(defaultServiceId);
		}
	}, [activeService, enabledServices, notEnabledServices, handleActiveService]);

	if (isLoading) {
		return (
			<div className="services-list-loading">
				<Skeleton active />
				<Skeleton active />
			</div>
		);
	}

	if (!awsServices?.length) {
		return (
			<div className="services-list-empty-message">
				{' '}
				<img
					src={emptyStateIconUrl}
					alt="no-services-found"
					className="empty-state-svg"
				/>{' '}
				No services found
			</div>
		);
	}

	const isEnabledServicesEmpty = enabledServices.length === 0;
	const isNotEnabledServicesEmpty = notEnabledServices.length === 0;

	const renderServiceItem = (
		service: CloudintegrationtypesServiceMetadataDTO,
	): JSX.Element => {
		return (
			<div
				className={cx('aws-services-list-view-sidebar-content-item', {
					active: service.id === activeService,
				})}
				key={service.id}
				onClick={(): void => handleActiveService(service.id)}
			>
				<img
					src={service.icon}
					alt={service.title}
					className="aws-services-list-view-sidebar-content-item-icon"
				/>
				<div className="aws-services-list-view-sidebar-content-item-title">
					{service.title}
				</div>
			</div>
		);
	};

	return (
		<div className="aws-services-list-view">
			<div className="aws-services-list-view-sidebar">
				<div className="aws-services-list-view-sidebar-content">
					<div className="aws-services-enabled">
						<div className="aws-services-list-view-sidebar-content-header">
							Enabled
						</div>
						{enabledServices.map((service) => renderServiceItem(service))}

						{isEnabledServicesEmpty && (
							<div className="aws-services-list-view-sidebar-content-item-empty-message">
								No enabled services
							</div>
						)}
					</div>

					{!isNotEnabledServicesEmpty && (
						<div className="aws-services-not-enabled">
							<div className="aws-services-list-view-sidebar-content-header">
								Not Enabled
							</div>
							{notEnabledServices.map((service) => renderServiceItem(service))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default ServicesList;
