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
import { StatusFilterKind } from '../StatusFilterCells/useSetStatusFilter';
import {
	CONTAINER_STATUS_FILTER_OPTIONS,
	NODE_READINESS_FILTER_OPTIONS,
	POD_STATUS_FILTER_OPTIONS,
} from './statusFilterOptions';

import styles from './EntityStatusFilter.module.scss';

interface StatusFilterSpec {
	kind: StatusFilterKind;
	/** Matches the entity's own status column header, so filter and column agree. */
	label: string;
}

const POD_STATUS_SPEC: StatusFilterSpec = { kind: 'pod', label: 'Pod status' };
const NODE_READINESS_SPEC: StatusFilterSpec = {
	kind: 'node',
	label: 'Node readiness',
};

/**
 * Which secondary status filters each list accepts — mirrors the filter structs in
 * pkg/types/inframonitoringtypes. Volumes take none, so they are absent here.
 */
const STATUS_FILTERS_BY_ENTITY: Partial<
	Record<InfraMonitoringEntity, StatusFilterSpec[]>
> = {
	[InfraMonitoringEntity.PODS]: [{ kind: 'pod', label: 'Status' }],
	[InfraMonitoringEntity.CONTAINERS]: [{ kind: 'container', label: 'Status' }],
	[InfraMonitoringEntity.NODES]: [NODE_READINESS_SPEC, POD_STATUS_SPEC],
	[InfraMonitoringEntity.CLUSTERS]: [NODE_READINESS_SPEC, POD_STATUS_SPEC],
	[InfraMonitoringEntity.NAMESPACES]: [POD_STATUS_SPEC],
	[InfraMonitoringEntity.DEPLOYMENTS]: [POD_STATUS_SPEC],
	[InfraMonitoringEntity.DAEMONSETS]: [POD_STATUS_SPEC],
	[InfraMonitoringEntity.STATEFULSETS]: [POD_STATUS_SPEC],
	[InfraMonitoringEntity.JOBS]: [POD_STATUS_SPEC],
};

const FILTER_KEY_BY_KIND: Record<StatusFilterKind, string> = {
	pod: 'pod_status',
	node: 'node_readiness',
	container: 'container_status',
};

const OPTIONS_BY_KIND = {
	pod: POD_STATUS_FILTER_OPTIONS,
	node: NODE_READINESS_FILTER_OPTIONS,
	container: CONTAINER_STATUS_FILTER_OPTIONS,
};

const ALL_VALUES_BY_KIND = {
	pod: FILTERABLE_POD_STATUSES,
	node: FILTERABLE_NODE_CONDITIONS,
	container: FILTERABLE_CONTAINER_STATUSES,
};

function EntityStatusFilter(): JSX.Element | null {
	const [category] = useInfraMonitoringCategory();
	const [podStatus, setPodStatus] = useInfraMonitoringPodStatusFilter();
	const [nodeReadiness, setNodeReadiness] =
		useInfraMonitoringNodeReadinessFilter();
	const [containerStatus, setContainerStatus] =
		useInfraMonitoringContainerStatusFilter();

	const specs = STATUS_FILTERS_BY_ENTITY[category as InfraMonitoringEntity];
	if (!specs) {
		return null;
	}

	const selectedByKind: Record<StatusFilterKind, string[]> = {
		pod: podStatus,
		node: nodeReadiness,
		container: containerStatus,
	};

	const setterByKind: Record<StatusFilterKind, (next: string[]) => void> = {
		pod: (next): void =>
			void setPodStatus(next.length > 0 ? (next as typeof podStatus) : null),
		node: (next): void =>
			void setNodeReadiness(
				next.length > 0 ? (next as typeof nodeReadiness) : null,
			),
		container: (next): void =>
			void setContainerStatus(
				next.length > 0 ? (next as typeof containerStatus) : null,
			),
	};

	return (
		<div className={styles.statusFilterGroup}>
			{specs.map((spec) => (
				<StatusMultiSelect
					key={spec.kind}
					label={spec.label}
					entity={category as InfraMonitoringEntity}
					filterKey={FILTER_KEY_BY_KIND[spec.kind]}
					options={OPTIONS_BY_KIND[spec.kind]}
					allValues={ALL_VALUES_BY_KIND[spec.kind]}
					selected={selectedByKind[spec.kind]}
					onChange={setterByKind[spec.kind]}
					testId={`${spec.kind}-status-filter`}
				/>
			))}
		</div>
	);
}

export default EntityStatusFilter;
