import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

function buildContainers(count: number): unknown[] {
	return Array.from({ length: count }, (_, index) => ({
		containerName: index === 0 ? 'loadgenerator' : `sidecar-${index}`,
		containerID: `containerd://${index}`,
		podName: 'app-demo-loadgenerator-579fbdd749-q5kgd',
		status: 'running',
		ready: true,
		restarts: index,
		image: 'ghcr.io/open-telemetry/demo:1.14.0-loadgenerator',
		cpuUsage: 0.12,
		memoryUsage: 148 * 1024 * 1024,
		meta: {
			'k8s.pod.name': 'app-demo-loadgenerator-579fbdd749-q5kgd',
			'k8s.namespace.name': 'generator',
			'k8s.cluster.name': 'mgmt',
			'k8s.node.name': 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-p6z7',
		},
	}));
}

export const overviewMocks = defineStoryMocks({
	controls: {
		containers: countControl('Containers', {
			group: 'Overview tab',
			value: 12,
			max: 40,
		}),
	},
	handlers: (values) => [
		// The filter's suggestions ask for these; without them the search box
		// logs a failed request and the story's smoke test fails on it
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

		rest.post(
			'http://localhost/api/v2/infra_monitoring/kube_containers',
			async (req, res, ctx) => {
				const { offset = 0, limit = 10 } = (await req.json()) as {
					offset?: number;
					limit?: number;
				};

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							type: 'list',
							records: buildContainers(values.containers).slice(
								offset,
								offset + limit,
							),
							total: values.containers,
						},
					}),
				);
			},
		),
	],
});
