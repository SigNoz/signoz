import type { Page } from '@playwright/test';

import { seederUrl } from './common';

// Seeding for the Kubernetes lists under /infrastructure-monitoring.

/** Resource attributes the pods list offers as group-by keys. */
const POD_RESOURCE_ATTRS = [
	'k8s.cluster.name',
	'k8s.namespace.name',
	'k8s.node.name',
	'k8s.pod.name',
	'k8s.pod.uid',
] as const;

/**
 * The metric the pods list queries. Its rows are what put
 * {@link POD_RESOURCE_ATTRS} into `/fields/keys`, which is where the group-by
 * select gets its options, so this is the metric to seed, not an arbitrary one.
 *
 * Dotted, not `k8s_pod_cpu_usage`: the list passes this name straight through as
 * `metricNamespace` and the backend matches it literally, so the underscored
 * spelling returns an empty key set and the group-by select renders "No data".
 */
const POD_CPU_METRIC = 'k8s.pod.cpu.usage';
const POD_MEMORY_METRIC = 'k8s.pod.memory.usage';

const NAMESPACES = ['default', 'kube-system', 'signoz'];
const PODS_PER_NAMESPACE = 2;
const POINTS_PER_POD = 4;
const POINT_INTERVAL_MS = 60_000;

type SeededMetric = {
	metric_name: string;
	timestamp: string;
	value: number;
	type_: string;
	temporality: string;
	is_monotonic: boolean;
	unit: string;
	resource_attrs: Record<string, string>;
	labels: Record<string, string>;
};

function podResourceAttrs(namespace: string, pod: string): Record<string, string> {
	return {
		'k8s.cluster.name': 'e2e-cluster',
		'k8s.namespace.name': namespace,
		'k8s.node.name': `node-${namespace}`,
		'k8s.pod.name': pod,
		'k8s.pod.uid': `${namespace}-${pod}`,
	};
}

function podPoints(now: number): SeededMetric[] {
	const points: SeededMetric[] = [];
	for (const namespace of NAMESPACES) {
		for (let p = 0; p < PODS_PER_NAMESPACE; p += 1) {
			const pod = `${namespace}-pod-${p}`;
			const resourceAttrs = podResourceAttrs(namespace, pod);
			for (let i = 0; i < POINTS_PER_POD; i += 1) {
				const timestamp = new Date(
					now - (POINTS_PER_POD - i) * POINT_INTERVAL_MS,
				).toISOString();
				points.push({
					metric_name: POD_CPU_METRIC,
					timestamp,
					value: 0.1 + i * 0.05,
					type_: 'Gauge',
					temporality: 'Unspecified',
					is_monotonic: false,
					unit: '1',
					resource_attrs: resourceAttrs,
					labels: resourceAttrs,
				});
				points.push({
					metric_name: POD_MEMORY_METRIC,
					timestamp,
					value: 100_000_000 + i * 1_000_000,
					type_: 'Gauge',
					temporality: 'Unspecified',
					is_monotonic: false,
					unit: 'By',
					resource_attrs: resourceAttrs,
					labels: resourceAttrs,
				});
			}
		}
	}
	return points;
}

/**
 * Seed pod metrics so the k8s list has rows and its group-by select has
 * options. Both matter: with no rows inside the queried window the select
 * renders empty and every `setK8sGroupBy` call times out.
 *
 * The pod keys go in `labels` as well as `resource_attrs`: the list's queries
 * reference some of them as `tag` and others as `resource`, and the series
 * fingerprint is computed off labels alone. With an empty label map all six
 * pods collapse into one series and the list comes back empty.
 *
 * Wrap the call in `seedWithRetry`: the seeder serves inserts on one
 * ClickHouse session, so parallel workers collide with a transient 500.
 */
export async function seedPodMetricsViaSeeder(page: Page): Promise<void> {
	const res = await page.request.post(`${seederUrl()}/telemetry/metrics`, {
		data: podPoints(Date.now()),
		headers: { 'Content-Type': 'application/json' },
	});
	if (!res.ok()) {
		throw new Error(
			`seeder POST /telemetry/metrics ${res.status()}: ${await res.text()}`,
		);
	}
}
