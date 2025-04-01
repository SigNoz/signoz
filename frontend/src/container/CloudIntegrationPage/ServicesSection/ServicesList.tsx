import Spinner from 'components/Spinner';
import { useGetAccountServices } from 'hooks/integration/aws/useGetAccountServices';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import ServiceItem from './ServiceItem';

interface ServicesListProps {
	cloudAccountId: string;
	filter: 'all_services' | 'enabled' | 'available';
}

function ServicesList({
	cloudAccountId,
	filter,
}: ServicesListProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: services = [], isLoading } = useGetAccountServices(
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

	const filteredServices = useMemo(() => {
		if (filter === 'all_services') return services;

		return services.filter((service) => {
			const isEnabled =
				service?.config?.logs?.enabled || service?.config?.metrics?.enabled;
			return filter === 'enabled' ? isEnabled : !isEnabled;
		});
	}, [services, filter]);

	useEffect(() => {
		if (activeService || !services?.length) return;

		handleActiveService(services[0].id);
	}, [services, activeService, handleActiveService]);

	if (isLoading) return <Spinner size="large" height="25vh" />;
	if (!services) return <div>No services found</div>;

	return (
		<div className="services-list">
			{filteredServices.map((service) => (
				<ServiceItem
					key={service.id}
					service={service}
					onClick={handleActiveService}
					isActive={service.id === activeService}
				/>
			))}
		</div>
	);
}

export default ServicesList;
