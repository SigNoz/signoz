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
		names: [
			'page-h1',
			'page-h2',
			'page-h3',
			'page-h4',
			'page-h5',
			'page-h6',
			'page-h7',
		],
		purpose: 'table TC-06/07/16',
	},
	hosts_orderby: {
		file: 'hosts_orderby',
		entity: 'hosts',
		names: ['order-h1', 'order-h2', 'order-h3', 'order-h4', 'order-h5'],
		purpose: 'table TC-08',
	},
	hosts_filter_dataset: {
		file: 'hosts_filter_dataset',
		entity: 'hosts',
		names: ['dev-linux-1', 'dev-windows-1', 'prod-linux-1', 'prod-windows-1'],
		purpose: 'filters TC-02/04/07/09',
	},
	hosts_missing_metrics: {
		file: 'hosts_missing_metrics',
		entity: 'hosts',
		names: ['miss-h1'],
		purpose: '`-`/TextNoData rendering',
	},
	hosts_status: {
		file: 'hosts_status',
		entity: 'hosts',
		names: ['active-h1', 'inactive-h1'],
		purpose: 'hosts TC-02/hosts TC-03 — Active/Inactive status filter and badge',
	},
	hosts_groupby_os_type: {
		file: 'hosts_groupby_os_type',
		entity: 'hosts',
		names: [],
		groups: { 'os.type': { linux: 3, windows: 3 } },
		purpose: 'hosts TC-07 and the hosts arm of group-by TC-*',
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
		names: [
			'page-p1',
			'page-p2',
			'page-p3',
			'page-p4',
			'page-p5',
			'page-p6',
			'page-p7',
		],
		purpose: 'table TC-06/07/16',
	},
	pods_orderby: {
		file: 'pods_orderby',
		entity: 'pods',
		names: ['order-p1', 'order-p2', 'order-p3', 'order-p4', 'order-p5'],
		purpose: 'table TC-08',
	},
	pods_groupby: {
		file: 'pods_groupby',
		entity: 'pods',
		names: [],
		groups: {
			'k8s.namespace.name': { 'gns-a': 2, 'gns-b': 2 },
			'k8s.node.name': { 'node-a': 2, 'node-b': 2 },
		},
		purpose:
			'group-by TC-*, expanded-row TC-* (clone up for the >10 member cases)',
	},
	pods_filter_dataset: {
		file: 'pods_filter_dataset',
		entity: 'pods',
		names: [
			'api-dev-1',
			'api-dev-2',
			'api-prod-1',
			'api-prod-2',
			'web-dev-1',
			'web-dev-2',
			'web-prod-1',
			'web-prod-2',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	pods_missing_metrics: {
		file: 'pods_missing_metrics',
		entity: 'pods',
		names: ['miss-p1'],
		purpose: 'pods TC-08 — a pod missing a metric renders `-`, not `0`',
	},
	pods_phases: {
		file: 'pods_phases',
		entity: 'pods',
		names: ['clbo-a', 'clbo-b', 'fail-p', 'pend-p', 'run-p', 'succ-p', 'unk-p'],
		purpose: 'pods TC-01 — one pod per status, plus a `no_data` pod',
	},
	pods_phases_grouped: {
		file: 'pods_phases_grouped',
		entity: 'pods',
		names: [],
		groups: { 'k8s.namespace.name': { 'ns-mixed': 6 } },
		purpose: 'pods TC-02 — podCountsByStatus breakdown in grouped view',
	},
	pods_phases_transition: {
		file: 'pods_phases_transition',
		entity: 'pods',
		names: ['trans-p'],
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
		names: [
			'carrier-phantom-host',
			'page-n1',
			'page-n2',
			'page-n3',
			'page-n4',
			'page-n5',
			'page-n6',
			'page-n7',
		],
		purpose: 'table TC-06/07/16',
	},
	nodes_orderby: {
		file: 'nodes_orderby',
		entity: 'nodes',
		names: [
			'carrier-phantom-host',
			'order-n1',
			'order-n2',
			'order-n3',
			'order-n4',
			'order-n5',
		],
		purpose: 'table TC-08',
	},
	nodes_groupby: {
		file: 'nodes_groupby',
		entity: 'nodes',
		names: [],
		groups: {
			'k8s.cluster.name': { 'gb-cluster-a': 2, 'gb-cluster-b': 2 },
		},
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	nodes_filter_dataset: {
		file: 'nodes_filter_dataset',
		entity: 'nodes',
		names: [
			'api-a-eu-1',
			'api-a-us-1',
			'api-b-eu-1',
			'api-b-us-1',
			'web-a-eu-1',
			'web-a-us-1',
			'web-b-eu-1',
			'web-b-us-1',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	nodes_missing_metrics: {
		file: 'nodes_missing_metrics',
		entity: 'nodes',
		names: ['miss-n1'],
		purpose: '`-`/TextNoData rendering',
	},
	nodes_conditions: {
		file: 'nodes_conditions',
		entity: 'nodes',
		names: [
			'carrier-phantom-host',
			'notready-n',
			'ready-n',
			'ready-n2',
			'ready-n3',
			'ready-n4',
		],
		purpose: 'nodes TC-01 — Ready / NotReady / NoData condition badges',
	},
	nodes_conditions_transition: {
		file: 'nodes_conditions_transition',
		entity: 'nodes',
		names: ['carrier-phantom-host', 'trans-n'],
		purpose: 'nodes TC-02 — a node whose condition flips mid-window',
	},
	nodes_conditions_grouped: {
		file: 'nodes_conditions_grouped',
		entity: 'nodes',
		names: [],
		groups: { 'k8s.cluster.name': { 'cluster-mixed': 3 } },
		purpose: 'nodes TC-03 — Pod Status ready vs not-ready counts',
	},

	// ── namespaces ───────────────────────────────────────────────────────────
	namespaces_value_accuracy: {
		file: 'namespaces_value_accuracy',
		entity: 'namespaces',
		names: ['acc-ns-1', 'acc-ns-2'],
		clusters: ['cluster-x', 'cluster-y'],
		purpose: 'happy-path namespace list; feeds namespaces TC-01 counts cards',
	},
	namespaces_pagination: {
		file: 'namespaces_pagination',
		entity: 'namespaces',
		names: [
			'page-ns-1',
			'page-ns-2',
			'page-ns-3',
			'page-ns-4',
			'page-ns-5',
			'page-ns-6',
			'page-ns-7',
		],
		purpose: 'table TC-06/07/16',
	},
	namespaces_orderby: {
		file: 'namespaces_orderby',
		entity: 'namespaces',
		names: ['order-ns-1', 'order-ns-2', 'order-ns-3', 'order-ns-4', 'order-ns-5'],
		purpose: 'table TC-08',
	},
	namespaces_groupby: {
		file: 'namespaces_groupby',
		entity: 'namespaces',
		names: [],
		groups: { 'k8s.cluster.name': { 'gb-cluster-a': 2, 'gb-cluster-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	namespaces_filter_dataset: {
		file: 'namespaces_filter_dataset',
		entity: 'namespaces',
		names: [
			'api-a-dev',
			'api-a-prod',
			'api-b-dev',
			'api-b-prod',
			'web-a-dev',
			'web-a-prod',
			'web-b-dev',
			'web-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	namespaces_missing_metrics: {
		file: 'namespaces_missing_metrics',
		entity: 'namespaces',
		names: ['miss-ns'],
		purpose: '`-`/TextNoData rendering',
	},
	namespaces_same_name_across_clusters: {
		file: 'namespaces_same_name_across_clusters',
		entity: 'namespaces',
		names: ['dup-ns'],
		purpose:
			'namespaces TC-04 — one namespace name in two clusters stays two rows',
	},

	// ── clusters ─────────────────────────────────────────────────────────────
	clusters_value_accuracy: {
		file: 'clusters_value_accuracy',
		entity: 'clusters',
		names: ['acc-cluster-1', 'acc-cluster-2'],
		purpose: 'happy-path cluster list; feeds clusters TC-01 counts cards',
	},
	clusters_pagination: {
		file: 'clusters_pagination',
		entity: 'clusters',
		names: [
			'page-c1',
			'page-c2',
			'page-c3',
			'page-c4',
			'page-c5',
			'page-c6',
			'page-c7',
		],
		purpose: 'table TC-06/07/16',
	},
	clusters_orderby: {
		file: 'clusters_orderby',
		entity: 'clusters',
		names: ['order-c1', 'order-c2', 'order-c3', 'order-c4', 'order-c5'],
		purpose: 'table TC-08',
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
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	clusters_filter_dataset: {
		file: 'clusters_filter_dataset',
		entity: 'clusters',
		names: [
			'api-aws-dev',
			'api-aws-prod',
			'api-gcp-dev',
			'api-gcp-prod',
			'web-aws-dev',
			'web-aws-prod',
			'web-gcp-dev',
			'web-gcp-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	clusters_missing_metrics: {
		file: 'clusters_missing_metrics',
		entity: 'clusters',
		names: ['miss-cluster'],
		purpose: '`-`/TextNoData rendering',
	},
	clusters_node_readiness: {
		file: 'clusters_node_readiness',
		entity: 'clusters',
		names: ['rn-cluster'],
		purpose: 'clusters TC-02 — Node Readiness column and breakdown tooltip',
	},
	clusters_pod_phases: {
		file: 'clusters_pod_phases',
		entity: 'clusters',
		names: ['pp-cluster'],
		purpose: 'clusters TC-04 — pod-phase roll-up into Pod Status',
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
		names: [
			'page-dep-1',
			'page-dep-2',
			'page-dep-3',
			'page-dep-4',
			'page-dep-5',
			'page-dep-6',
			'page-dep-7',
		],
		purpose: 'table TC-06/07/16',
	},
	deployments_orderby: {
		file: 'deployments_orderby',
		entity: 'deployments',
		names: [
			'order-dep-1',
			'order-dep-2',
			'order-dep-3',
			'order-dep-4',
			'order-dep-5',
		],
		purpose: 'table TC-08',
	},
	deployments_groupby: {
		file: 'deployments_groupby',
		entity: 'deployments',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	deployments_filter_dataset: {
		file: 'deployments_filter_dataset',
		entity: 'deployments',
		names: [
			'api-a-dev',
			'api-a-prod',
			'api-b-dev',
			'api-b-prod',
			'web-a-dev',
			'web-a-prod',
			'web-b-dev',
			'web-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	deployments_missing_metrics: {
		file: 'deployments_missing_metrics',
		entity: 'deployments',
		names: ['miss-dep'],
		purpose: '`-`/TextNoData rendering',
	},
	deployments_desired_available: {
		file: 'deployments_desired_available',
		entity: 'deployments',
		names: ['da-dep'],
		purpose:
			'deployments TC-01 — Pod Replicas available/desired with the warning colour',
	},
	deployments_non_deployment_pods: {
		file: 'deployments_non_deployment_pods',
		entity: 'deployments',
		names: ['nd-dep'],
		purpose:
			'deployments TC-05 — pods not owned by a deployment stay out of the roll-up',
	},
	deployments_same_name_across_ns_and_clusters: {
		file: 'deployments_same_name_across_ns_and_clusters',
		entity: 'deployments',
		names: ['dup-dep'],
		purpose:
			'deployments TC-04 — same name across namespaces/clusters stays distinct rows',
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
		names: [
			'page-ss-1',
			'page-ss-2',
			'page-ss-3',
			'page-ss-4',
			'page-ss-5',
			'page-ss-6',
			'page-ss-7',
		],
		purpose: 'table TC-06/07/16',
	},
	statefulsets_orderby: {
		file: 'statefulsets_orderby',
		entity: 'statefulsets',
		names: ['order-ss-1', 'order-ss-2', 'order-ss-3', 'order-ss-4', 'order-ss-5'],
		purpose: 'table TC-08',
	},
	statefulsets_groupby: {
		file: 'statefulsets_groupby',
		entity: 'statefulsets',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	statefulsets_filter_dataset: {
		file: 'statefulsets_filter_dataset',
		entity: 'statefulsets',
		names: [
			'api-a-dev',
			'api-a-prod',
			'api-b-dev',
			'api-b-prod',
			'web-a-dev',
			'web-a-prod',
			'web-b-dev',
			'web-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	statefulsets_desired_current: {
		file: 'statefulsets_desired_current',
		entity: 'statefulsets',
		names: ['dc-ss'],
		purpose: 'statefulsets TC-01 — Pod Replicas current/desired',
	},
	statefulsets_non_ss_pods: {
		file: 'statefulsets_non_ss_pods',
		entity: 'statefulsets',
		names: ['ns-ss'],
		purpose: 'statefulsets TC-05 — non-statefulset pods excluded',
	},
	statefulsets_same_name_across_ns_and_clusters: {
		file: 'statefulsets_same_name_across_ns_and_clusters',
		entity: 'statefulsets',
		names: ['dup-ss'],
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
		names: [
			'page-ds-1',
			'page-ds-2',
			'page-ds-3',
			'page-ds-4',
			'page-ds-5',
			'page-ds-6',
			'page-ds-7',
		],
		purpose: 'table TC-06/07/16',
	},
	daemonsets_orderby: {
		file: 'daemonsets_orderby',
		entity: 'daemonsets',
		names: ['order-ds-1', 'order-ds-2', 'order-ds-3', 'order-ds-4', 'order-ds-5'],
		purpose: 'table TC-08',
	},
	daemonsets_groupby: {
		file: 'daemonsets_groupby',
		entity: 'daemonsets',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	daemonsets_filter_dataset: {
		file: 'daemonsets_filter_dataset',
		entity: 'daemonsets',
		names: [
			'logs-a-dev',
			'logs-a-prod',
			'logs-b-dev',
			'logs-b-prod',
			'metrics-a-dev',
			'metrics-a-prod',
			'metrics-b-dev',
			'metrics-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	daemonsets_desired_current: {
		file: 'daemonsets_desired_current',
		entity: 'daemonsets',
		names: ['dc-ds'],
		purpose: 'daemonsets TC-01 — Scheduled Nodes',
	},
	daemonsets_non_ds_pods: {
		file: 'daemonsets_non_ds_pods',
		entity: 'daemonsets',
		names: ['nd-ds'],
		purpose: 'non-daemonset pods excluded',
	},
	daemonsets_same_name_across_ns_and_clusters: {
		file: 'daemonsets_same_name_across_ns_and_clusters',
		entity: 'daemonsets',
		names: ['dup-ds'],
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
		names: [
			'page-job-1',
			'page-job-2',
			'page-job-3',
			'page-job-4',
			'page-job-5',
			'page-job-6',
			'page-job-7',
		],
		purpose: 'table TC-06/07/16',
	},
	jobs_orderby: {
		file: 'jobs_orderby',
		entity: 'jobs',
		names: [
			'order-job-1',
			'order-job-2',
			'order-job-3',
			'order-job-4',
			'order-job-5',
		],
		purpose: 'table TC-08',
	},
	jobs_groupby: {
		file: 'jobs_groupby',
		entity: 'jobs',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	jobs_filter_dataset: {
		file: 'jobs_filter_dataset',
		entity: 'jobs',
		names: [
			'cron-a-dev',
			'cron-a-prod',
			'cron-b-dev',
			'cron-b-prod',
			'etl-a-dev',
			'etl-a-prod',
			'etl-b-dev',
			'etl-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	jobs_missing_metrics: {
		file: 'jobs_missing_metrics',
		entity: 'jobs',
		names: ['miss-job'],
		purpose: '`-`/TextNoData rendering',
	},
	jobs_lifecycle: {
		file: 'jobs_lifecycle',
		entity: 'jobs',
		names: ['lc-job'],
		purpose: 'jobs TC-01 — Completions column',
	},
	jobs_completed: {
		file: 'jobs_completed',
		entity: 'jobs',
		names: ['done-job'],
		purpose: 'jobs TC-03 — a completed job still lists with its final counts',
	},
	jobs_non_job_pods: {
		file: 'jobs_non_job_pods',
		entity: 'jobs',
		names: ['nj-job'],
		purpose: 'non-job pods excluded',
	},
	jobs_same_name_across_ns_and_clusters: {
		file: 'jobs_same_name_across_ns_and_clusters',
		entity: 'jobs',
		names: ['dup-job'],
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
		names: [
			'page-pvc-1',
			'page-pvc-2',
			'page-pvc-3',
			'page-pvc-4',
			'page-pvc-5',
			'page-pvc-6',
			'page-pvc-7',
		],
		purpose: 'table TC-06/07/16',
	},
	volumes_orderby: {
		file: 'volumes_orderby',
		entity: 'volumes',
		names: [
			'order-pvc-1',
			'order-pvc-2',
			'order-pvc-3',
			'order-pvc-4',
			'order-pvc-5',
		],
		purpose: 'table TC-08',
	},
	volumes_groupby: {
		file: 'volumes_groupby',
		entity: 'volumes',
		names: [],
		groups: { 'k8s.namespace.name': { 'gb-ns-a': 2, 'gb-ns-b': 2 } },
		purpose: 'group-by TC-*, expanded-row TC-*',
	},
	volumes_filter_dataset: {
		file: 'volumes_filter_dataset',
		entity: 'volumes',
		names: [
			'data-ns-a-dev',
			'data-ns-a-prod',
			'data-ns-b-dev',
			'data-ns-b-prod',
			'logs-ns-a-dev',
			'logs-ns-a-prod',
			'logs-ns-b-dev',
			'logs-ns-b-prod',
		],
		purpose: 'filters TC-02/04/07/09',
	},
	volumes_usage_formula: {
		file: 'volumes_usage_formula',
		entity: 'volumes',
		names: ['uf-pvc'],
		purpose: 'volumes TC-01 — Used progress bar computed from the usage formula',
	},
	volumes_non_pvc_volume: {
		file: 'volumes_non_pvc_volume',
		entity: 'volumes',
		names: ['np-real-pvc'],
		purpose: 'volumes TC-05 — non-PVC volumes excluded',
	},
	volumes_formula_operand_missing: {
		file: 'volumes_formula_operand_missing',
		entity: 'volumes',
		names: ['fop-pvc'],
		purpose:
			'volumes TC-06 — a formula with a missing operand renders `-`, no crash',
	},
	volumes_same_name_across_ns_and_clusters: {
		file: 'volumes_same_name_across_ns_and_clusters',
		entity: 'volumes',
		names: ['dup-pvc'],
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
 * One row of a `*_value_accuracy_expected.json`.
 *
 * Deliberately open: each entity's file uses its own field names
 * (`podCPU`, `volumeUsage`, `namespaceCPU` …) and namespaces nests a `counts`
 * object. Callers reach for the field they are asserting and
 * {@link expectedRecord} does the "is it actually there" check.
 */
export interface ExpectedRecord {
	[field: string]: string | number | Record<string, number> | undefined;
}

export interface ExpectedValues {
	records: ExpectedRecord[];
}

/**
 * The integration suite's `*_value_accuracy_expected.json`, when one exists —
 * the assertion source for value-accuracy scenarios, so expected numbers are
 * read rather than invented.
 *
 * Returns `null` when the dataset has no expectation file; use
 * {@link expectedRecord} when the scenario requires one.
 */
export function expectedValues(key: DatasetKey): ExpectedValues | null {
	const file = path.join(TESTDATA_DIR, `${DATASETS[key].file}_expected.json`);
	if (!fs.existsSync(file)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(file, 'utf8')) as ExpectedValues;
}

/**
 * One named record from a dataset's expectation file, or a failure that says
 * which dataset and which record.
 *
 * This is the entry point value-accuracy scenarios should use. Reading the
 * expected number rather than hardcoding it is what keeps a fixture edit from
 * silently invalidating an assertion — and what stops a scenario settling for
 * `not.toHaveText('')`, which passes on the `-` that means "no data".
 */
export function expectedRecord(
	key: DatasetKey,
	nameField: string,
	name: string,
): ExpectedRecord {
	const expected = expectedValues(key);
	if (!expected) {
		throw new Error(
			`dataset ${key} has no *_expected.json — value-accuracy assertions need one`,
		);
	}
	const record = expected.records.find((row) => row[nameField] === name);
	if (!record) {
		const found = expected.records.map((row) => String(row[nameField]));
		throw new Error(
			`dataset ${key}: no expected record with ${nameField}='${name}' (found ${found.join(', ')})`,
		);
	}
	return record;
}

/**
 * A metric's value for one named entity, read straight out of the fixture.
 *
 * The companion to {@link expectedRecord}, and needed because the two do not
 * cover the same ground: `*_expected.json` exists only for the ten
 * `*_value_accuracy` datasets, while most value-accuracy *scenarios* seed a
 * different fixture (`deployments_desired_available`, `jobs_lifecycle`,
 * `volumes_usage_formula`, …) that has no expectation file. Those still must not
 * hardcode a magic number — §6's rule is "read it, don't invent it", and a
 * fixture edit should fail the assertion rather than silently invalidate it.
 *
 * Also the right source when the expectation file records a *different* quantity
 * than the column under test: `pods_value_accuracy_expected.json` carries
 * `podCPULimit` (the limit, in cores) while the `cpu_limit` column renders
 * `k8s.pod.cpu_limit_utilization` (a ratio).
 */
export function fixtureMetric(
	key: DatasetKey,
	nameLabel: string,
	name: string,
	metricName: string,
): number {
	const file = datasetPath(key);
	const rows = fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map(
			(line) =>
				JSON.parse(line) as {
					metric_name?: string;
					labels?: Record<string, string>;
					value?: number;
				},
		);
	const match = rows.find(
		(row) => row.metric_name === metricName && row.labels?.[nameLabel] === name,
	);
	if (match?.value === undefined) {
		const available = [
			...new Set(
				rows
					.filter((row) => row.labels?.[nameLabel] === name)
					.map((row) => row.metric_name ?? '?'),
			),
		];
		throw new Error(
			`dataset ${key}: no '${metricName}' for ${nameLabel}='${name}' ` +
				`(that entity has ${available.join(', ') || 'no rows'})`,
		);
	}
	return match.value;
}

/** A numeric field from an expected record, checked rather than coerced. */
export function expectedNumber(record: ExpectedRecord, field: string): number {
	const value = record[field];
	if (typeof value !== 'number') {
		throw new Error(
			`expected record has no numeric '${field}' (got ${JSON.stringify(value)})`,
		);
	}
	return value;
}
