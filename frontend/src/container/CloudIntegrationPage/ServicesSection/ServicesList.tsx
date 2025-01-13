import { useGetAccountServices } from 'hooks/integrations/aws/useGetAccountServices';
import useUrlQuery from 'hooks/useUrlQuery';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import ServiceItem from './ServiceItem';

function ServicesList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();

	const accountId = urlQuery.get('accountId');

	const { data: services, isLoading } = useGetAccountServices(
		accountId || undefined,
	);

	const [activeService, setActiveService] = useState<string | null>(
		urlQuery.get('service') || services?.[0]?.id || null,
	);

	const handleServiceClick = (serviceId: string): void => {
		setActiveService(serviceId);
		urlQuery.set('service', serviceId);
		navigate({ search: urlQuery.toString() });
	};

	if (isLoading) return <div>Loading...</div>;

	if (!services) return <div>No services found</div>;
	return (
		<div className="services-list">
			{services.map((service) => (
				<ServiceItem
					key={service.id}
					service={service}
					isActive={activeService === service.id}
					onClick={handleServiceClick}
				/>
			))}
		</div>
	);
}

export default ServicesList;
