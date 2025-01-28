import './ServicesTabs.style.scss';

import { Color } from '@signozhq/design-tokens';
import type { SelectProps, TabsProps } from 'antd';
import { Select, Tabs } from 'antd';
import { getAwsServices } from 'api/integrations/aws';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';

import ServiceDetails from './ServiceDetails';
import ServicesList from './ServicesList';

interface ServicesFilterProps {
	accountId: string;
	onFilterChange: (value: 'all_services' | 'enabled' | 'available') => void;
}

function ServicesFilter({
	accountId,
	onFilterChange,
}: ServicesFilterProps): JSX.Element | null {
	const { data: services, isLoading } = useQuery(
		[REACT_QUERY_KEY.AWS_SERVICES, accountId],
		() => getAwsServices(accountId),
	);

	const { enabledCount, availableCount } = useMemo(() => {
		if (!services) return { enabledCount: 0, availableCount: 0 };

		return services.reduce(
			(acc, service) => {
				const isEnabled =
					service?.config?.logs?.enabled || service?.config?.metrics?.enabled;
				return {
					enabledCount: acc.enabledCount + (isEnabled ? 1 : 0),
					availableCount: acc.availableCount + (isEnabled ? 0 : 1),
				};
			},
			{ enabledCount: 0, availableCount: 0 },
		);
	}, [services]);

	const selectOptions: SelectProps['options'] = useMemo(
		() => [
			{ value: 'all_services', label: `All Services (${services?.length || 0})` },
			{ value: 'enabled', label: `Enabled (${enabledCount})` },
			{ value: 'available', label: `Available (${availableCount})` },
		],
		[services, enabledCount, availableCount],
	);

	if (isLoading) return null;
	if (!services?.length) return null;

	return (
		<div className="services-filter">
			<Select
				style={{ width: '100%' }}
				defaultValue="all_services"
				options={selectOptions}
				className="services-sidebar__select"
				suffixIcon={<ChevronDown size={16} color={Color.BG_VANILLA_400} />}
				onChange={onFilterChange}
			/>
		</div>
	);
}

interface ServicesSectionProps {
	accountId: string;
}

function ServicesSection({ accountId }: ServicesSectionProps): JSX.Element {
	const [activeFilter, setActiveFilter] = useState<
		'all_services' | 'enabled' | 'available'
	>('all_services');

	return (
		<div className="services-section">
			<div className="services-section__sidebar">
				<ServicesFilter accountId={accountId} onFilterChange={setActiveFilter} />
				<ServicesList accountId={accountId} filter={activeFilter} />
			</div>
			<div className="services-section__content">
				<ServiceDetails />
			</div>
		</div>
	);
}

interface ServicesTabsProps {
	accountId: string;
}

function ServicesTabs({ accountId }: ServicesTabsProps): JSX.Element {
	const tabItems: TabsProps['items'] = [
		{
			key: 'services',
			label: 'Services For Integration',
			children: <ServicesSection accountId={accountId} />,
		},
	];

	return (
		<div className="services-tabs">
			<Tabs defaultActiveKey="services" items={tabItems} />
		</div>
	);
}

export default ServicesTabs;
