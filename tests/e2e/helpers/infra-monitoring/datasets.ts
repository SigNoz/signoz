/**
 * Logical dataset name → the JSONL fixture that backs it, plus the facts a spec
 * needs to assert against it. Specs never hardcode a filename or a pod name.
 *
 * The fixtures live in `tests/integration/testdata/inframonitoring/` and are
 * owned by the Python integration suite. They are **read, not copied** — one
 * source of truth instead of a drifting duplicate under `tests/e2e/testdata/`.
 */

import fs from 'fs';
import path from 'path';

/** Where the integration suite keeps its inframonitoring fixtures. */
export const TESTDATA_DIR = path.resolve(
	__dirname,
	'../../../integration/testdata/inframonitoring',
);

export interface DatasetFacts {
	/** Fixture basename, without the `.jsonl` extension. */
	file: string;
	/** Which entity's list endpoint reports the rows. */
	entity: string;
	/** Entity names the dataset seeds, sorted. */
	names: string[];
	/** Namespaces present, when the dataset carries `k8s.namespace.name`. */
	namespaces?: string[];
	/** Clusters present, when the dataset carries `k8s.cluster.name`. */
	clusters?: string[];
	/** Group label → member count, keyed by the attribute the group is on. */
	groups?: Record<string, Record<string, number>>;
	/** Notes on what the dataset exists to exercise. */
	purpose: string;
}

/**
 * Every dataset a spec references. `names`/`groups` are transcribed from the
 * fixtures; {@link assertDatasetFacts} re-derives them at runtime so a fixture
 * edit fails loudly here instead of silently in an unrelated assertion.
 */
export const DATASETS = {
	// ── hosts ────────────────────────────────────────────────────────────────
	hosts_value_accuracy: {
		file: 'hosts_value_accuracy',
		entity: 'hosts',
		names: ['acc-h1', 'acc-h2'],
		purpose: 'happy-path host list; has a *_expected.json assertion source',
	},
	hosts_pagination: {
		file: 'hosts_pagination',
		entity: 'hosts',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	hosts_orderby: {
		file: 'hosts_orderby',
		entity: 'hosts',
		names: [],
		purpose: 'B-LIST-08',
	},
	hosts_filter_dataset: {
		file: 'hosts_filter_dataset',
		entity: 'hosts',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	hosts_missing_metrics: {
		file: 'hosts_missing_metrics',
		entity: 'hosts',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	hosts_status: {
		file: 'hosts_status',
		entity: 'hosts',
		names: [],
		purpose: 'H-02/H-03 — Active/Inactive status filter and badge',
	},
	hosts_groupby_os_type: {
		file: 'hosts_groupby_os_type',
		entity: 'hosts',
		names: [],
		groups: { 'os.type': { linux: 3, windows: 3 } },
		purpose: 'H-07 and the hosts arm of B-GRP-*',
	},

	// ── pods ─────────────────────────────────────────────────────────────────
	pods_value_accuracy: {
		file: 'pods_value_accuracy',
		entity: 'pods',
		names: ['acc-p1', 'acc-p2'],
		namespaces: ['ns-a', 'ns-b'],
		clusters: ['cluster-x'],
		purpose:
			'happy-path pod list; carries `k8s.pod.uid` (acc-p1-uid, acc-p2-uid)',
	},
	pods_pagination: {
		file: 'pods_pagination',
		entity: 'pods',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	pods_orderby: {
		file: 'pods_orderby',
		entity: 'pods',
		names: [],
		purpose: 'B-LIST-08',
	},
	pods_groupby: {
		file: 'pods_groupby',
		entity: 'pods',
		names: [],
		groups: {
			'k8s.namespace.name': { 'gns-a': 2, 'gns-b': 2 },
			'k8s.node.name': { 'node-a': 2, 'node-b': 2 },
		},
		purpose: 'B-GRP-*, B-EXP-* (clone up for the >10 member cases)',
	},
	pods_filter_dataset: {
		file: 'pods_filter_dataset',
		entity: 'pods',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	pods_missing_metrics: {
		file: 'pods_missing_metrics',
		entity: 'pods',
		names: [],
		purpose: 'P-08 — a pod missing a metric renders `-`, not `0`',
	},
	pods_phases: {
		file: 'pods_phases',
		entity: 'pods',
		names: [],
		purpose: 'P-01 — one pod per status, plus a `no_data` pod',
	},
	pods_phases_grouped: {
		file: 'pods_phases_grouped',
		entity: 'pods',
		names: [],
		groups: { 'k8s.namespace.name': { 'ns-mixed': 6 } },
		purpose: 'P-02 — podCountsByStatus breakdown in grouped view',
	},
	pods_phases_transition: {
		file: 'pods_phases_transition',
		entity: 'pods',
		names: [],
		purpose: 'a pod whose phase flips mid-window reports the latest state',
	},

	// ── nodes ────────────────────────────────────────────────────────────────
	nodes_value_accuracy: {
		file: 'nodes_value_accuracy',
		entity: 'nodes',
		names: ['acc-n1', 'acc-n2'],
		clusters: ['cluster-x', 'cluster-y'],
		purpose: 'happy-path node list',
	},
	nodes_pagination: {
		file: 'nodes_pagination',
		entity: 'nodes',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	nodes_orderby: {
		file: 'nodes_orderby',
		entity: 'nodes',
		names: [],
		purpose: 'B-LIST-08',
	},
	nodes_groupby: {
		file: 'nodes_groupby',
		entity: 'nodes',
		names: [],
		groups: {
			'k8s.cluster.name': { 'gb-cluster-a': 2, 'gb-cluster-b': 2 },
		},
		purpose: 'B-GRP-*, B-EXP-*',
	},
	nodes_filter_dataset: {
		file: 'nodes_filter_dataset',
		entity: 'nodes',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	nodes_missing_metrics: {
		file: 'nodes_missing_metrics',
		entity: 'nodes',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	nodes_conditions: {
		file: 'nodes_conditions',
		entity: 'nodes',
		names: [],
		purpose: 'N-01 — Ready / NotReady / NoData condition badges',
	},
	nodes_conditions_transition: {
		file: 'nodes_conditions_transition',
		entity: 'nodes',
		names: [],
		purpose: 'N-02 — a node whose condition flips mid-window',
	},
	nodes_conditions_grouped: {
		file: 'nodes_conditions_grouped',
		entity: 'nodes',
		names: [],
		groups: { 'k8s.cluster.name': { 'cluster-mixed': 3 } },
		purpose: 'N-03 — Pod Status ready vs not-ready counts',
	},

	// ── namespaces ───────────────────────────────────────────────────────────
	namespaces_value_accuracy: {
		file: 'namespaces_value_accuracy',
		entity: 'namespaces',
		names: ['acc-ns-1', 'acc-ns-2'],
		clusters: ['cluster-x', 'cluster-y'],
		purpose: 'happy-path namespace list; feeds NS-01 counts cards',
	},
	namespaces_pagination: {
		file: 'namespaces_pagination',
		entity: 'namespaces',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	namespaces_orderby: {
		file: 'namespaces_orderby',
		entity: 'namespaces',
		names: [],
		purpose: 'B-LIST-08',
	},
	namespaces_groupby: {
		file: 'namespaces_groupby',
		entity: 'namespaces',
		names: [],
		groups: { 'k8s.cluster.name': { 'gb-cluster-a': 2, 'gb-cluster-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	namespaces_filter_dataset: {
		file: 'namespaces_filter_dataset',
		entity: 'namespaces',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	namespaces_missing_metrics: {
		file: 'namespaces_missing_metrics',
		entity: 'namespaces',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	namespaces_same_name_across_clusters: {
		file: 'namespaces_same_name_across_clusters',
		entity: 'namespaces',
		names: [],
		purpose: 'NS-04 — one namespace name in two clusters stays two rows',
	},

	// ── clusters ─────────────────────────────────────────────────────────────
	clusters_value_accuracy: {
		file: 'clusters_value_accuracy',
		entity: 'clusters',
		names: ['acc-cluster-1', 'acc-cluster-2'],
		purpose: 'happy-path cluster list; feeds C-01 counts cards',
	},
	clusters_pagination: {
		file: 'clusters_pagination',
		entity: 'clusters',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	clusters_orderby: {
		file: 'clusters_orderby',
		entity: 'clusters',
		names: [],
		purpose: 'B-LIST-08',
	},
	clusters_groupby: {
		file: 'clusters_groupby',
		entity: 'clusters',
		names: [],
		groups: {
			'k8s.cluster.name': {
				'gb-gcp-1': 1,
				'gb-gcp-2': 1,
				'gb-aws-1': 1,
				'gb-aws-2': 1,
			},
		},
		purpose: 'B-GRP-*, B-EXP-*',
	},
	clusters_filter_dataset: {
		file: 'clusters_filter_dataset',
		entity: 'clusters',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	clusters_missing_metrics: {
		file: 'clusters_missing_metrics',
		entity: 'clusters',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	clusters_node_readiness: {
		file: 'clusters_node_readiness',
		entity: 'clusters',
		names: [],
		purpose: 'C-02 — Node Readiness column and breakdown tooltip',
	},
	clusters_pod_phases: {
		file: 'clusters_pod_phases',
		entity: 'clusters',
		names: [],
		purpose: 'C-04 — pod-phase roll-up into Pod Status',
	},

	// ── deployments ──────────────────────────────────────────────────────────
	deployments_value_accuracy: {
		file: 'deployments_value_accuracy',
		entity: 'deployments',
		names: ['acc-dep-1', 'acc-dep-2'],
		namespaces: ['ns-acc'],
		clusters: ['cluster-x'],
		purpose: 'happy-path deployment list',
	},
	deployments_pagination: {
		file: 'deployments_pagination',
		entity: 'deployments',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	deployments_orderby: {
		file: 'deployments_orderby',
		entity: 'deployments',
		names: [],
		purpose: 'B-LIST-08',
	},
	deployments_groupby: {
		file: 'deployments_groupby',
		entity: 'deployments',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	deployments_filter_dataset: {
		file: 'deployments_filter_dataset',
		entity: 'deployments',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	deployments_missing_metrics: {
		file: 'deployments_missing_metrics',
		entity: 'deployments',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	deployments_desired_available: {
		file: 'deployments_desired_available',
		entity: 'deployments',
		names: [],
		purpose: 'D-01 — Pod Replicas available/desired with the warning colour',
	},
	deployments_non_deployment_pods: {
		file: 'deployments_non_deployment_pods',
		entity: 'deployments',
		names: [],
		purpose: 'D-05 — pods not owned by a deployment stay out of the roll-up',
	},
	deployments_same_name_across_ns_and_clusters: {
		file: 'deployments_same_name_across_ns_and_clusters',
		entity: 'deployments',
		names: [],
		purpose: 'D-04 — same name across namespaces/clusters stays distinct rows',
	},

	// ── statefulsets ─────────────────────────────────────────────────────────
	statefulsets_value_accuracy: {
		file: 'statefulsets_value_accuracy',
		entity: 'statefulsets',
		names: ['acc-ss-1', 'acc-ss-2'],
		namespaces: ['ns-acc'],
		clusters: ['cluster-x'],
		purpose: 'happy-path statefulset list',
	},
	statefulsets_pagination: {
		file: 'statefulsets_pagination',
		entity: 'statefulsets',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	statefulsets_orderby: {
		file: 'statefulsets_orderby',
		entity: 'statefulsets',
		names: [],
		purpose: 'B-LIST-08',
	},
	statefulsets_groupby: {
		file: 'statefulsets_groupby',
		entity: 'statefulsets',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	statefulsets_filter_dataset: {
		file: 'statefulsets_filter_dataset',
		entity: 'statefulsets',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	statefulsets_desired_current: {
		file: 'statefulsets_desired_current',
		entity: 'statefulsets',
		names: [],
		purpose: 'S-01 — Pod Replicas current/desired',
	},
	statefulsets_non_ss_pods: {
		file: 'statefulsets_non_ss_pods',
		entity: 'statefulsets',
		names: [],
		purpose: 'S-05 — non-statefulset pods excluded',
	},
	statefulsets_same_name_across_ns_and_clusters: {
		file: 'statefulsets_same_name_across_ns_and_clusters',
		entity: 'statefulsets',
		names: [],
		purpose: 'identity/dedup',
	},

	// ── daemonsets ───────────────────────────────────────────────────────────
	daemonsets_value_accuracy: {
		file: 'daemonsets_value_accuracy',
		entity: 'daemonsets',
		names: ['acc-ds-1', 'acc-ds-2'],
		namespaces: ['ns-acc'],
		clusters: ['cluster-x'],
		purpose: 'happy-path daemonset list',
	},
	daemonsets_pagination: {
		file: 'daemonsets_pagination',
		entity: 'daemonsets',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	daemonsets_orderby: {
		file: 'daemonsets_orderby',
		entity: 'daemonsets',
		names: [],
		purpose: 'B-LIST-08',
	},
	daemonsets_groupby: {
		file: 'daemonsets_groupby',
		entity: 'daemonsets',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	daemonsets_filter_dataset: {
		file: 'daemonsets_filter_dataset',
		entity: 'daemonsets',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	daemonsets_desired_current: {
		file: 'daemonsets_desired_current',
		entity: 'daemonsets',
		names: [],
		purpose: 'DS-01 — Scheduled Nodes',
	},
	daemonsets_non_ds_pods: {
		file: 'daemonsets_non_ds_pods',
		entity: 'daemonsets',
		names: [],
		purpose: 'non-daemonset pods excluded',
	},
	daemonsets_same_name_across_ns_and_clusters: {
		file: 'daemonsets_same_name_across_ns_and_clusters',
		entity: 'daemonsets',
		names: [],
		purpose: 'identity/dedup',
	},

	// ── jobs ─────────────────────────────────────────────────────────────────
	jobs_value_accuracy: {
		file: 'jobs_value_accuracy',
		entity: 'jobs',
		names: ['acc-job-1', 'acc-job-2'],
		namespaces: ['ns-acc'],
		clusters: ['cluster-x'],
		purpose: 'happy-path job list',
	},
	jobs_pagination: {
		file: 'jobs_pagination',
		entity: 'jobs',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	jobs_orderby: {
		file: 'jobs_orderby',
		entity: 'jobs',
		names: [],
		purpose: 'B-LIST-08',
	},
	jobs_groupby: {
		file: 'jobs_groupby',
		entity: 'jobs',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	jobs_filter_dataset: {
		file: 'jobs_filter_dataset',
		entity: 'jobs',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	jobs_missing_metrics: {
		file: 'jobs_missing_metrics',
		entity: 'jobs',
		names: [],
		purpose: '`-`/TextNoData rendering',
	},
	jobs_lifecycle: {
		file: 'jobs_lifecycle',
		entity: 'jobs',
		names: [],
		purpose: 'J-01 — Completions column',
	},
	jobs_completed: {
		file: 'jobs_completed',
		entity: 'jobs',
		names: [],
		purpose: 'J-03 — a completed job still lists with its final counts',
	},
	jobs_non_job_pods: {
		file: 'jobs_non_job_pods',
		entity: 'jobs',
		names: [],
		purpose: 'non-job pods excluded',
	},
	jobs_same_name_across_ns_and_clusters: {
		file: 'jobs_same_name_across_ns_and_clusters',
		entity: 'jobs',
		names: [],
		purpose: 'identity/dedup',
	},

	// ── volumes ──────────────────────────────────────────────────────────────
	volumes_value_accuracy: {
		file: 'volumes_value_accuracy',
		entity: 'volumes',
		names: ['acc-pvc-1', 'acc-pvc-2'],
		namespaces: ['ns-acc'],
		clusters: ['cluster-x'],
		purpose: 'happy-path volume list',
	},
	volumes_pagination: {
		file: 'volumes_pagination',
		entity: 'volumes',
		names: [],
		purpose: 'B-LIST-06/07/16',
	},
	volumes_orderby: {
		file: 'volumes_orderby',
		entity: 'volumes',
		names: [],
		purpose: 'B-LIST-08',
	},
	volumes_groupby: {
		file: 'volumes_groupby',
		entity: 'volumes',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'B-GRP-*, B-EXP-*',
	},
	volumes_filter_dataset: {
		file: 'volumes_filter_dataset',
		entity: 'volumes',
		names: [],
		purpose: 'B-FLT-02/04/07/09',
	},
	volumes_usage_formula: {
		file: 'volumes_usage_formula',
		entity: 'volumes',
		names: [],
		purpose: 'V-01 — Used progress bar computed from the usage formula',
	},
	volumes_non_pvc_volume: {
		file: 'volumes_non_pvc_volume',
		entity: 'volumes',
		names: [],
		purpose: 'V-05 — non-PVC volumes excluded',
	},
	volumes_formula_operand_missing: {
		file: 'volumes_formula_operand_missing',
		entity: 'volumes',
		names: [],
		purpose: 'V-06 — a formula with a missing operand renders `-`, no crash',
	},
	volumes_same_name_across_ns_and_clusters: {
		file: 'volumes_same_name_across_ns_and_clusters',
		entity: 'volumes',
		names: [],
		purpose: 'identity/dedup',
	},
} satisfies Record<string, DatasetFacts>;

export type DatasetKey = keyof typeof DATASETS;

/**
 * A dataset's facts, widened to {@link DatasetFacts}. Reach for this rather than
 * indexing `DATASETS` directly: the literal type of each entry omits the
 * optional keys it does not set, so `DATASETS[key].groups` does not type-check
 * across the union.
 */
export function datasetFacts(key: DatasetKey): DatasetFacts {
	return DATASETS[key];
}

export function datasetPath(key: DatasetKey): string {
	return path.join(TESTDATA_DIR, `${DATASETS[key].file}.jsonl`);
}

/**
 * The integration suite's `*_value_accuracy_expected.json`, when one exists —
 * the assertion source for value-accuracy scenarios, so expected numbers are
 * read rather than invented.
 */
export function expectedValues(key: DatasetKey): unknown {
	const file = path.join(TESTDATA_DIR, `${DATASETS[key].file}_expected.json`);
	if (!fs.existsSync(file)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Which label carries the entity name, per entity kind. */
export const NAME_LABEL: Record<string, string> = {
	hosts: 'host.name',
	pods: 'k8s.pod.name',
	nodes: 'k8s.node.name',
	namespaces: 'k8s.namespace.name',
	clusters: 'k8s.cluster.name',
	deployments: 'k8s.deployment.name',
	statefulsets: 'k8s.statefulset.name',
	daemonsets: 'k8s.daemonset.name',
	jobs: 'k8s.job.name',
	volumes: 'k8s.persistentvolumeclaim.name',
};
