import './ServicesTabs.style.scss';

import { Color } from '@signozhq/design-tokens';
import type { SelectProps, TabsProps } from 'antd';
import { Button, Select, Table, Tabs } from 'antd';
import cx from 'classnames';
import useUrlQuery from 'hooks/useUrlQuery';
import { ChevronDown, Wrench } from 'lucide-react';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import { serviceDetails, services } from './data';
import { Service, ServiceData } from './types';

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
	service: Service;
	onClick: (serviceName: string) => void;
	isActive?: boolean;
}): JSX.Element {
	return (
		<button
			className={cx('service-item', { active: isActive })}
			onClick={(): void => onClick(service.id)}
			type="button"
		>
			<div className="service-item__icon-wrapper">
				<img
					src={service.icon}
					alt={service.title}
					className="service-item__icon"
				/>
			</div>
			<div className="service-item__title">
				<LineClampedText text={service.title} />
			</div>
		</button>
	);
}

ServiceItem.defaultProps = {
	isActive: false,
};

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

function DashboardItem({
	dashboard,
}: {
	dashboard: ServiceData['assets']['dashboards'][number];
}): JSX.Element {
	return (
		<div className="cloud-service-dashboard-item">
			<div className="cloud-service-dashboard-item__title">{dashboard.title}</div>
			<div className="cloud-service-dashboard-item__preview">
				<img
					src={dashboard.image}
					alt={dashboard.title}
					className="cloud-service-dashboard-item__preview-image"
				/>
			</div>
		</div>
	);
}

function DashboardsTab({ service }: { service: ServiceData }): JSX.Element {
	return (
		<>
			{service.assets.dashboards.map((dashboard) => (
				<DashboardItem key={dashboard.id} dashboard={dashboard} />
			))}
		</>
	);
}

function CloudServiceDataCollected({
	logsData,
	metricsData,
}: {
	logsData: ServiceData['data_collected']['logs'];
	metricsData: ServiceData['data_collected']['metrics'];
}): JSX.Element {
	const logsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '30%',
		},
		{
			title: 'PATH',
			dataIndex: 'path',
			key: 'path',
			width: '40%',
		},
		{
			title: 'FACET TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const metricsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '40%',
		},
		{
			title: 'UNIT',
			dataIndex: 'unit',
			key: 'unit',
			width: '30%',
		},
		{
			title: 'TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const tableProps = {
		pagination: { pageSize: 20, hideOnSinglePage: true },
		showHeader: true,
		size: 'middle' as const,
		bordered: false,
	};

	return (
		<div className="cloud-service-data-collected">
			<div className="cloud-service-data-collected__table">
				<div className="cloud-service-data-collected__table-heading">Logs</div>
				<Table
					columns={logsColumns}
					dataSource={logsData}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...tableProps}
					className="cloud-service-data-collected__table-logs"
				/>
			</div>
			<div className="cloud-service-data-collected__table">
				<div className="cloud-service-data-collected__table-heading">Metrics</div>
				<Table
					columns={metricsColumns}
					dataSource={metricsData}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...tableProps}
					className="cloud-service-data-collected__table-metrics"
				/>
			</div>
		</div>
	);
}

function DataCollectedTab({ service }: { service: ServiceData }): JSX.Element {
	return (
		<CloudServiceDataCollected
			logsData={service.data_collected.logs || []}
			metricsData={service.data_collected.metrics || []}
		/>
	);
}

function ServiceDetails({ service }: { service: ServiceData }): JSX.Element {
	const tabItems: TabsProps['items'] = [
		{
			key: 'dashboards',
			label: `Dashboards (${service.assets.dashboards.length})`,
			children: <DashboardsTab service={service} />,
		},
		{
			key: 'data-collected',
			label: 'Data Collected',
			children: <DataCollectedTab service={service} />,
		},
	];
	return (
		<div className="service-details">
			<div className="service-details__title-bar">
				<div className="service-details__details-title">Details</div>
				<div className="service-details__right-actions">
					<Button className="configure-button">
						<Wrench size={12} color={Color.BG_VANILLA_400} />
						Configure
					</Button>
				</div>
			</div>
			<div className="service-details__overview">{service.overview}</div>
			<div className="service-details__tabs">
				<Tabs items={tabItems} />
			</div>
		</div>
	);
}

function ServicesSection(): JSX.Element {
	const urlQuery = useUrlQuery();
	const navigate = useNavigate();
	const [activeService, setActiveService] = useState<string | null>(
		urlQuery.get('service') || null,
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
