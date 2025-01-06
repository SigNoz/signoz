import './ServicesTabs.style.scss';

import { Color } from '@signozhq/design-tokens';
import type { SelectProps, TabsProps } from 'antd';
import { Select, Tabs } from 'antd';
import useUrlQuery from 'hooks/useUrlQuery';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import { serviceDetails, services } from './data';
import ServiceDetails from './ServiceDetails';
import ServicesList from './ServicesList';

const selectOptions: SelectProps['options'] = [
	{ value: 'all_services', label: 'All Services (24)' },
	{ value: 'enabled', label: 'Enabled (12)' },
	{ value: 'available', label: 'Available (12)' },
];

function ServicesFilter(): JSX.Element {
	return (
		<div className="services-filter">
			<Select
				style={{ width: '100%' }}
				defaultValue="all_services"
				options={selectOptions}
				className="services-sidebar__select"
				suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
				onChange={(value): void => {
					console.log('selected region:', value);
				}}
			/>
		</div>
	);
}

function ServicesSection(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const [activeService, setActiveService] = useState<string | null>(
		urlQuery.get('service') || serviceDetails[0].id,
	);

	const handleServiceClick = (serviceId: string): void => {
		setActiveService(serviceId);
		urlQuery.set('service', serviceId);
		navigate({ search: urlQuery.toString() });
	};

	const activeServiceDetails = serviceDetails.find(
		(service) => service.id === activeService,
	);

	return (
		<div className="services-section">
			<div className="services-section__sidebar">
				<ServicesFilter />
				<ServicesList
					services={services}
					onClick={handleServiceClick}
					activeService={activeService}
				/>
			</div>
			<div className="services-section__content">
				{activeServiceDetails && <ServiceDetails service={activeServiceDetails} />}
			</div>
		</div>
	);
}

function ServicesTabs(): JSX.Element {
	const tabItems: TabsProps['items'] = [
		{
			key: 'services',
			label: 'Services For Integration',
			children: <ServicesSection />,
		},
	];

	return (
		<div className="services-tabs">
			<Tabs defaultActiveKey="services" items={tabItems} />
		</div>
	);
}

export default ServicesTabs;
