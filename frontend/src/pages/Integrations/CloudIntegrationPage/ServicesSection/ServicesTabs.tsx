import { Color } from '@signozhq/design-tokens';
import type { SelectProps, TabsProps } from 'antd';
import { Select, Tabs } from 'antd';
import cx from 'classnames';
import { ChevronDown } from 'lucide-react';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useState } from 'react';

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

function ServiceItem({
	service,
	onClick,
	isActive,
}: {
	service: { name: string; icon: string };
	onClick: (serviceName: string) => void;
	isActive?: boolean;
}): JSX.Element {
	return (
		<button
			className={cx('service-item', { active: isActive })}
			onClick={(): void => onClick(service.name)}
			type="button"
		>
			<div className="service-item__icon-wrapper">
				<img src={service.icon} alt="aws-logo" className="service-item__icon" />
			</div>
			<div className="service-item__name">
				<LineClampedText text={service.name} />
			</div>
		</button>
	);
}

ServiceItem.defaultProps = {
	isActive: false,
};

function ServicesList({
	services,
}: {
	services: { name: string; icon: string }[];
}): JSX.Element {
	const [activeService, setActiveService] = useState<string | null>(null);
	const handleServiceClick = (serviceName: string): void => {
		setActiveService(serviceName);
	};
	return (
		<div className="services-list">
			{services.map((service) => (
				<ServiceItem
					key={service.name}
					service={service}
					isActive={activeService === service.name}
					onClick={handleServiceClick}
				/>
			))}
		</div>
	);
}

function ServicesSection(): JSX.Element {
	const services = [
		{
			name: 'Amazon EKS',
			icon: '/Logos/aws-dark.svg?a=1',
			description:
				'Amazon Elastic Kubernetes Service (EKS) is a managed Kubernetes service that automates certain aspects of deployment and maintenance for any standard Kubernetes environment. Whether you are migrating an existing Kubernetes application to Amazon EKS, or are deploying a new cluster on Amazon EKS on AWS Outposts',
		},
		{
			name: 'Amazon S3',
			icon: '/Logos/aws-dark.svg?a=2',
			description:
				'Amazon S3 is a managed Kubernetes service that automates certain aspects of deployment and maintenance for any standard Kubernetes environment. Whether you are migrating an existing Kubernetes application to Amazon EKS, or are deploying a new cluster on Amazon EKS on AWS Outposts',
		},
		{
			name: 'Amazon DynamoDB',
			icon: '/Logos/aws-dark.svg?a=3',
			description:
				'Amazon DynamoDB is a managed Kubernetes service that automates certain aspects of deployment and maintenance for any standard Kubernetes environment. Whether you are migrating an existing Kubernetes application to Amazon EKS, or are deploying a new cluster on Amazon EKS on AWS Outposts',
		},
	];
	return (
		<div className="services-section">
			<div className="services-section__sidebar">
				<ServicesFilter />
				<ServicesList services={services} />
			</div>
			<div className="services-section__content">
				Lorem ipsum, dolor sit amet consectetur adipisicing elit. Rem iure
				voluptatibus iusto consectetur eius excepturi ut ex, sint possimus eos
				fugiat tempore repellat ratione facere nemo nostrum optio ipsa nam?
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
