/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8sV2/constants';

import { infraStoryMocks } from '../stories/InfrastructureMonitoring.stories.mocks';
import { infraListResponse } from '../stories/__story_mockdata__/infraMonitoring';

/**
 * A node name long enough that the pod's metadata tooltip has to wrap, which the
 * page's own fixture is too short to show. The Rows, Query warning and Empty
 * state controls do not reach the story using this handler.
 */
export const podLongNodeName = rest.post(
	'http://localhost/api/v2/infra_monitoring/pods',
	async (req, res, ctx) => {
		const body = (await req.json()) as { offset?: number; limit?: number };

		const list = infraListResponse({
			entity: InfraMonitoringEntity.PODS,
			count: 20,
			offset: body.offset ?? 0,
			limit: body.limit ?? 10,
		});

		return res(
			ctx.status(200),
			ctx.json({
				...list,
				data: {
					...list.data,
					records: list.data.records.map((record) => ({
						...record,
						meta: {
							...record.meta,
							[INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME]:
								'ip-10-0-3-17.eu-central-1.compute.internal (spot, gpu-a10g, capacity-reservation cr-0f21a8b7)',
						},
					})),
				},
			}),
		);
	},
);

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
