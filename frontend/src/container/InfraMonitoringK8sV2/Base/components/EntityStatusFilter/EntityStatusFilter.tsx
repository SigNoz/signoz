import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import {
	FILTERABLE_CONTAINER_STATUSES,
	FILTERABLE_NODE_CONDITIONS,
	FILTERABLE_POD_STATUSES,
	useInfraMonitoringCategory,
	useInfraMonitoringContainerStatusFilter,
	useInfraMonitoringNodeReadinessFilter,
	useInfraMonitoringPodStatusFilter,
} from 'container/InfraMonitoringK8sV2/hooks';

import StatusMultiSelect from './StatusMultiSelect';
import {
	CONTAINER_STATUS_FILTER_OPTIONS,
	NODE_READINESS_FILTER_OPTIONS,
	POD_STATUS_FILTER_OPTIONS,
} from './statusFilterOptions';

import styles from './EntityStatusFilter.module.scss';

function EntityStatusFilter(): JSX.Element | null {
	const [category] = useInfraMonitoringCategory();
	const [podStatus, setPodStatus] = useInfraMonitoringPodStatusFilter();
	const [nodeReadiness, setNodeReadiness] =
		useInfraMonitoringNodeReadinessFilter();
	const [containerStatus, setContainerStatus] =
		useInfraMonitoringContainerStatusFilter();

	if (category === InfraMonitoringEntity.CONTAINERS) {
		return (
			<StatusMultiSelect
				label="Status"
				entity={InfraMonitoringEntity.CONTAINERS}
				filterKey="container_status"
				options={CONTAINER_STATUS_FILTER_OPTIONS}
				allValues={FILTERABLE_CONTAINER_STATUSES}
				selected={containerStatus}
				onChange={(next): void => {
					void setContainerStatus(next.length > 0 ? next : null);
				}}
				testId="container-status-filter"
			/>
		);
	}

	if (category === InfraMonitoringEntity.PODS) {
		return (
			<StatusMultiSelect
				label="Pod status"
				entity={InfraMonitoringEntity.PODS}
				filterKey="pod_status"
				options={POD_STATUS_FILTER_OPTIONS}
				allValues={FILTERABLE_POD_STATUSES}
				selected={podStatus}
				onChange={(next): void => {
					void setPodStatus(next.length > 0 ? next : null);
				}}
				testId="pod-status-filter"
			/>
		);
	}

	if (category === InfraMonitoringEntity.NODES) {
		return (
			<div className={styles.statusFilterGroup}>
				<StatusMultiSelect
					label="Readiness"
					entity={InfraMonitoringEntity.NODES}
					filterKey="node_readiness"
					options={NODE_READINESS_FILTER_OPTIONS}
					allValues={FILTERABLE_NODE_CONDITIONS}
					selected={nodeReadiness}
					onChange={(next): void => {
						void setNodeReadiness(next.length > 0 ? next : null);
					}}
					testId="node-readiness-filter"
				/>
				<StatusMultiSelect
					label="Pod status"
					entity={InfraMonitoringEntity.NODES}
					filterKey="pod_status"
					options={POD_STATUS_FILTER_OPTIONS}
					allValues={FILTERABLE_POD_STATUSES}
					selected={podStatus}
					onChange={(next): void => {
						void setPodStatus(next.length > 0 ? next : null);
					}}
					testId="node-pod-status-filter"
				/>
			</div>
		);
	}

	return null;
}

export default EntityStatusFilter;
