import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Skeleton } from 'antd';
import cx from 'classnames';
import { useGetAccountServices } from 'hooks/integration/aws/useGetAccountServices';
import useUrlQuery from 'hooks/useUrlQuery';

import { Service } from './types';

interface ServicesListProps {
	cloudAccountId: string;
}

/** Service is enabled if even one sub item (log or metric) is enabled */
function hasAnySubItemEnabled(service: Service): boolean {
	const logs = service.config?.logs ?? {};
	const metrics = service.config?.metrics ?? {};
	return logs.enabled || metrics.enabled;
}

function ServicesList({ cloudAccountId }: ServicesListProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: awsServices = [], isLoading } = useGetAccountServices(
		cloudAccountId,
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
		() => awsServices?.filter(hasAnySubItemEnabled) ?? [],
		[awsServices],
	);

	// Derive from enabled to guarantee each service is in exactly one list
	const enabledIds = useMemo(() => new Set(enabledServices.map((s) => s.id)), [
		enabledServices,
	]);
	const notEnabledServices = useMemo(
		() => awsServices?.filter((s) => !enabledIds.has(s.id)) ?? [],
		[awsServices, enabledIds],
	);

	useEffect(() => {
		const allServices = [...enabledServices, ...notEnabledServices];

		// If a service is already selected and still exists in the refreshed list, keep it
		if (activeService && allServices.some((s) => s.id === activeService)) {
			// Update the selected service reference to the fresh object from the new list
			const freshService = allServices.find((s) => s.id === activeService);
			if (freshService) {
				handleActiveService(freshService.id);
			}
			return;
		}

		// No valid selection — pick a default
		if (enabledServices.length > 0) {
			handleActiveService(enabledServices[0].id);
		} else if (notEnabledServices.length > 0) {
			handleActiveService(notEnabledServices[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabledServices, notEnabledServices]);

	// const filteredServices = useMemo(() => {
	// 	if (filter === 'all_services') {
	// 		return services;
	// 	}

	// 	return services.filter((service) => {
	// 		const isEnabled =
	// 			service?.config?.logs?.enabled || service?.config?.metrics?.enabled;
	// 		return filter === 'enabled' ? isEnabled : !isEnabled;
	// 	});
	// }, [services, filter]);

	useEffect(() => {
		if (activeService || !awsServices?.length) {
			return;
		}

		handleActiveService(awsServices[0].id);
	}, [awsServices, activeService, handleActiveService]);

	if (isLoading) {
		return (
			<div className="services-list-loading">
				<Skeleton active />
				<Skeleton active />
			</div>
		);
	}

	if (!awsServices?.length) {
		return <div>No services found</div>;
	}

	// return (
	// 	<div className="services-list">
	// 		{filteredServices.map((service) => (
	// 			<ServiceItem
	// 				key={service.id}
	// 				service={service}
	// 				onClick={handleActiveService}
	// 				isActive={service.id === activeService}
	// 			/>
	// 		))}
	// 	</div>
	// );

	const isEnabledServicesEmpty = enabledServices.length === 0;
	const isNotEnabledServicesEmpty = notEnabledServices.length === 0;

	const renderServiceItem = (service: Service): JSX.Element => {
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
