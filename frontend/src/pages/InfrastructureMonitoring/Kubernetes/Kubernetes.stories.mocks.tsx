/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';

import { infraStoryMocks } from '../InfrastructureMonitoring.stories.mocks';

/**
 * One mocks module per resource the Kubernetes tab lists. They all answer the
 * same endpoints; the entity they carry is what picks the list resource, the
 * checks type, the group-by attribute and the tabs the drawer offers, and it is
 * what puts `?category=` on the route the story starts on.
 */
export const podsMocks = infraStoryMocks(InfraMonitoringEntity.PODS);
export const nodesMocks = infraStoryMocks(InfraMonitoringEntity.NODES);
export const namespacesMocks = infraStoryMocks(
	InfraMonitoringEntity.NAMESPACES,
);
export const clustersMocks = infraStoryMocks(InfraMonitoringEntity.CLUSTERS);
export const deploymentsMocks = infraStoryMocks(
	InfraMonitoringEntity.DEPLOYMENTS,
);
export const jobsMocks = infraStoryMocks(InfraMonitoringEntity.JOBS);
export const daemonSetsMocks = infraStoryMocks(
	InfraMonitoringEntity.DAEMONSETS,
);
export const statefulSetsMocks = infraStoryMocks(
	InfraMonitoringEntity.STATEFULSETS,
);
export const volumesMocks = infraStoryMocks(InfraMonitoringEntity.VOLUMES);
