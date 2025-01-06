import ServiceItem from './ServiceItem';
import { Service } from './types';

function ServicesList({
	services,
	onClick,
	activeService,
}: {
	services: Service[];
	onClick: (serviceName: string) => void;
	activeService: string | null;
}): JSX.Element {
	return (
		<div className="services-list">
			{services.map((service) => (
				<ServiceItem
					key={service.id}
					service={service}
					isActive={activeService === service.id}
					onClick={onClick}
				/>
			))}
		</div>
	);
}

export default ServicesList;
