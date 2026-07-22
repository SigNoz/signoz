import { Container } from '@signozhq/icons';
import { InfraMonitoringEvents } from 'constants/events';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';

import { CustomTab } from '../Base/K8sBaseDetails';
import {
	InfraMonitoringEntity,
	podUtilizationByPodWidgetInfo,
	VIEW_TYPES,
} from '../constants';

import EntityMetrics from './EntityMetrics';

const categoryToEventEntity: Record<InfraMonitoringEntity, string> = {
	[InfraMonitoringEntity.DAEMONSETS]: InfraMonitoringEvents.DaemonSet,
	[InfraMonitoringEntity.DEPLOYMENTS]: InfraMonitoringEvents.Deployment,
	[InfraMonitoringEntity.JOBS]: InfraMonitoringEvents.Job,
	[InfraMonitoringEntity.NAMESPACES]: InfraMonitoringEvents.Namespace,
	[InfraMonitoringEntity.STATEFULSETS]: InfraMonitoringEvents.StatefulSet,
	[InfraMonitoringEntity.PODS]: InfraMonitoringEvents.Pod,
	[InfraMonitoringEntity.NODES]: InfraMonitoringEvents.Node,
	[InfraMonitoringEntity.CLUSTERS]: InfraMonitoringEvents.Cluster,
	[InfraMonitoringEntity.VOLUMES]: InfraMonitoringEvents.Volume,
	[InfraMonitoringEntity.HOSTS]: InfraMonitoringEvents.HostEntity,
	[InfraMonitoringEntity.CONTAINERS]: 'container',
};

interface CreatePodMetricsTabParams<T> {
	getQueryPayload: (
		entity: T,
		start: number,
		end: number,
		dotMetricsEnabled: boolean,
	) => GetQueryResultsProps[];
	queryKey: string;
	category: InfraMonitoringEntity;
	docBasePath?: string;
}

export function createPodMetricsTab<T>({
	getQueryPayload,
	queryKey,
	category,
	docBasePath,
}: CreatePodMetricsTabParams<T>): CustomTab<T> {
	const eventEntity = categoryToEventEntity[category];

	const widgetInfo = docBasePath
		? podUtilizationByPodWidgetInfo.map((widget) => ({
				...widget,
				docPath: widget.docPath ? `${docBasePath}${widget.docPath}` : undefined,
			}))
		: podUtilizationByPodWidgetInfo;

	return {
		key: VIEW_TYPES.POD_METRICS,
		label: 'Pod Metrics',
		icon: <Container size={14} />,
		render: ({ entity }) => (
			<EntityMetrics
				entity={entity}
				eventEntity={eventEntity}
				entityWidgetInfo={widgetInfo}
				getEntityQueryPayload={getQueryPayload}
				queryKey={queryKey}
				category={category}
			/>
		),
	};
}
