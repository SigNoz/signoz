import Spinner from 'components/Spinner';
import { useGetAccountServices } from 'hooks/integrations/aws/useGetAccountServices';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import ServiceItem from './ServiceItem';

interface ServicesListProps {
	accountId: string;
	filter: 'all_services' | 'enabled' | 'available';
}

function ServicesList({ accountId, filter }: ServicesListProps): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const { data: services = [], isLoading } = useGetAccountServices(accountId);
	const activeService = urlQuery.get('service');

	const handleServiceClick = (serviceId: string): void => {
		urlQuery.set('service', serviceId);
		navigate({ search: urlQuery.toString() });
	};

	const filteredServices = useMemo(() => {
		if (filter === 'all_services') return services;

		return services.filter((service) => {
			const isEnabled =
				service?.config?.logs?.enabled || service?.config?.metrics?.enabled;
			return filter === 'enabled' ? isEnabled : !isEnabled;
		});
	}, [services, filter]);

	if (isLoading) return <Spinner size="large" height="25vh" />;
	if (!services) return <div>No services found</div>;

	return (
		<div className="services-list">
			{filteredServices.map((service) => (
				<ServiceItem
					key={service.id}
					service={service}
					onClick={handleServiceClick}
					isActive={service.id === activeService}
				/>
			))}
		</div>
	);
}

export default ServicesList;
