import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import {
	StatusFilterValue,
	useInfraMonitoringPageListing,
	useInfraMonitoringStatusFilter,
} from 'container/InfraMonitoringK8sV2/hooks';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import styles from './StatusFilter.module.scss';
import { logInfraFilterCustomizedEvent } from 'container/InfraMonitoringK8sV2/Base/events';

const statusOptions: Array<{
	label: string;
	value: StatusFilterValue | 'all';
}> = [
	{ label: 'All', value: 'all' },
	{ label: 'Active', value: 'active' },
	{ label: 'Inactive', value: 'inactive' },
];

function StatusFilter(): JSX.Element {
	const [statusFilter, setStatusFilter] = useInfraMonitoringStatusFilter();
	const [, setCurrentPage] = useInfraMonitoringPageListing();
	const { currentQuery } = useQueryBuilder();

	const handleChange = (value: string): void => {
		if (value !== undefined) {
			void setStatusFilter(value === 'all' ? '' : (value as StatusFilterValue));
			void setCurrentPage(1);

			const expression =
				currentQuery.builder.queryData[0]?.filter?.expression || '';
			logInfraFilterCustomizedEvent(
				InfraMonitoringEntity.HOSTS,
				'host_status_toggle',
				expression,
				value === 'all' ? [] : ['host_status'],
			);
		}
	};

	return (
		<div className={styles.statusFilterContainer}>
			<div className={styles.statusLabel}>Status</div>
			<ToggleGroup
				type="single"
				value={statusFilter === '' ? 'all' : statusFilter}
				onChange={handleChange}
				className={styles.statusToggleGroup}
			>
				{statusOptions.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						aria-label={option.label}
						className={styles.statusToggleItem}
					>
						<span
							className={`${styles.statusDot} ${
								option.value === 'active'
									? styles.activeDot
									: option.value === 'inactive'
										? styles.inactiveDot
										: styles.allDot
							}`}
						/>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}

export default StatusFilter;
