import './ServicesTabs.style.scss';

import { Color } from '@signozhq/design-tokens';
import type { SelectProps, TabsProps } from 'antd';
import { Select, Tabs } from 'antd';
import { ChevronDown } from 'lucide-react';

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
	return (
		<div className="services-section">
			<div className="services-section__sidebar">
				<ServicesFilter />
				<ServicesList />
			</div>
			<div className="services-section__content">
				<ServiceDetails />
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
