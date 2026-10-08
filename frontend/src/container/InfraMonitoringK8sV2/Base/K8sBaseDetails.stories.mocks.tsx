import { rest } from 'msw';

import { toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

export const POD_UID = '63edbad0-398e-48e5-baba-f7ded7c73f1b';
const POD_NAME = 'app-demo-loadgenerator-579fbdd749-q5kgd';
export const NODE_NAME = 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-p6z7';

const POD_META = {
	'k8s.pod.uid': POD_UID,
	'k8s.pod.name': POD_NAME,
	'k8s.namespace.name': 'generator',
	'k8s.cluster.name': 'mgmt',
	'k8s.node.name': NODE_NAME,
	'k8s.deployment.name': 'app-demo-loadgenerator',
};

const podRecord = {
	podUID: POD_UID,
	podCPU: 0.92,
	podCPURequest: 31,
	podCPULimit: 30.7,
	podMemory: 148 * 1024 * 1024,
	podMemoryRequest: 42,
	podMemoryLimit: 38,
	podStatus: 'running',
	podRestarts: 0,
	podAge: 49_000_000,
	meta: POD_META,
};

const container = {
	containerName: 'loadgenerator',
	podName: POD_NAME,
	status: 'running',
	ready: true,
	restarts: 0,
	meta: POD_META,
};

const list = (records: unknown[]): Record<string, unknown> => ({
	status: 'success',
	data: { type: 'list', records, total: records.length },
});

export const drawerMocks = defineStoryMocks({
	controls: {
		openedFromANode: toggleControl('Opened from a node', {
			group: 'Drawer',
			value: true,
		}),
	},
	handlers: () => [
		rest.post('http://localhost/api/v2/infra_monitoring/pods', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(list([podRecord]))),
		),

		rest.post(
			'http://localhost/api/v2/infra_monitoring/kube_containers',
			(_req, res, ctx) => res(ctx.status(200), ctx.json(list([container]))),
		),

		rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { keys: {}, complete: true } }),
			),
		),

		rest.get('http://localhost/api/v1/fields/values', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { values: {}, complete: true } }),
			),
		),
	],
});
