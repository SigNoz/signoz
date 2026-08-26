/**
 * The infra-monitoring entity registry — the single place a new entity gets
 * added, and the source of every expected value the `base/` specs assert.
 *
 * `K8sBaseList` and `K8sBaseDetails` are entity-agnostic: the only thing that
 * varies between the ten entities is the config object handed to them. So every
 * behaviour those two components provide is asserted *from this table* rather
 * than from a per-entity spec, which is what makes an `all`-level scenario one
 * loop instead of ten near-identical tests.
 *
 * Everything here is read off the product source (`container/InfraMonitoringK8sV2/**`,
 * `container/InfraMonitoringHostsV2/**`). When a value here stops matching, that
 * is a user-visible change and the registry is supposed to have to be updated.
 */

import type { DatasetKey } from './datasets';

export type EntityCapability =
	| 'groupBy'
	| 'statusFilter'
	| 'countsCards'
	| 'podMetricsTab'
	| 'logsTab'
	| 'tracesTab'
	| 'eventsTab'
	| 'tabBar';

export interface EntityColumn {
	/** Data column id — also `toggle-column-<id>` in the options panel. */
	id: string;
	/** Visible header text. */
	header: string;
	/** `defaultVisibility: false` — hidden until toggled on. */
	hiddenByDefault: boolean;
	/** `enableSort: true`. */
	sortable: boolean;
	visibility?: 'hidden-on-expand' | 'hidden-on-collapse';
	pinned?: 'left' | 'right';
	/** `enableRemove: false` — the switch in the options panel is disabled. */
	required?: boolean;
}

/** Extra `selectedItem*` params an entity's `getItemKey` writes to the URL. */
export type SelectedItemExtra = 'clusterName' | 'namespaceName';

export interface EntitySeedFacts {
	/**
	 * Dataset covering a happy-path list.
	 *
	 * Typed as `DatasetKey`, not `string`. As `string` these four fields cost the
	 * suite 55 `as DatasetKey` casts at their call sites, and a typo type-checked
	 * clean and then died inside `datasetPath` as
	 * `Cannot read properties of undefined (reading 'file')` — naming neither the
	 * entity nor the field. `datasets.ts` imports only `fs`/`path`, so there is no
	 * cycle to justify the loose type.
	 */
	primary: DatasetKey;
	/** Dataset whose group membership the group-by / expanded-row specs use. */
	grouped: DatasetKey;
	pagination: DatasetKey;
	orderBy: DatasetKey;
	/**
	 * Dataset whose rows differ in the attributes the quick-filter rail and the
	 * expression editor filter on, so a filter can narrow the list rather than
	 * leaving it whole. `pagination` cannot: its rows are near-identical by
	 * construction, which is what made the filter specs seed it and assert only
	 * that *something* rendered.
	 */
	filter: DatasetKey;
	/** One row's name, for row-scoped locators. */
	sampleName: string;
	/**
	 * The value `selectedItem` takes for `sampleName`. Same as `sampleName`
	 * everywhere except pods, which identify rows by UID.
	 */
	sampleItemKey: string;
	/** `selectedItemClusterName` for `sampleName`, when the entity writes one. */
	sampleClusterName?: string;
	/** `selectedItemNamespaceName` for `sampleName`, when the entity writes one. */
	sampleNamespaceName?: string;
	/** One group label from `grouped`, under `groupByAttribute`. */
	sampleGroup: string;
}

export interface EntityDef {
	/** `category` param value, storage-key segment, and registry key. */
	key: string;
	/** Left-rail label. */
	label: string;
	route: string;
	/** `category-<key>` in the left rail; undefined for hosts (no rail). */
	categoryTestId?: string;
	columnStorageKey: string;
	expandedColumnStorageKey: string;
	pageSizeStorageKey: string;
	/**
	 * The product's column matrix, mirrored by hand.
	 *
	 * Present only for the entities a `once`- or `representative`-level scenario
	 * runs on. Every scenario that read it for all ten was asserting a literal in
	 * `table.config.tsx` against a literal here, through a browser, so the six
	 * others carry no copy to keep in sync. Do not back-fill them for symmetry:
	 * widen the scenario first, and the field with it.
	 */
	columns?: EntityColumn[];
	nameColumnId: string;
	groupColumnId: string;
	/** `ENTITY_FILTER_PLACEHOLDERS[key]`, verbatim. Mirrored, see {@link EntityDef.columns}. */
	filterPlaceholder?: string;
	/** `METRIC_NAMESPACE_BY_ENTITY[key]`. Mirrored, see {@link EntityDef.columns}. */
	metricNamespace?: string;
	/** Quick-filter section titles, in order. Mirrored, see {@link EntityDef.columns}. */
	quickFilterTitles?: string[];
	/** The subset of `quickFilterTitles` with `defaultOpen: true`. */
	quickFilterDefaultOpen?: string[];
	/**
	 * Drawer metadata row labels, in order — casing is deliberately verbatim.
	 * Mirrored, see {@link EntityDef.columns}.
	 */
	metadataLabels?: string[];
	/** Metrics-tab `chart-header` titles, in order. Mirrored, see {@link EntityDef.columns}. */
	widgetTitles?: string[];
	/** `EntityCountsSection` labels, when the entity has counts cards. */
	countsCards?: string[];
	capabilities: Set<EntityCapability>;
	selectedItemExtraParams: SelectedItemExtra[];
	/** Attribute the group-by / expanded-row specs group on. */
	groupByAttribute: string;
	/**
	 * A sortable, default-visible column whose values {@link EntityDef.orderByDataset}
	 * actually varies across rows.
	 *
	 * Needed twice over. Not every sortable column has a backing metric in the
	 * fixture — sorting by one returns an empty list, and an empty list renders the
	 * empty state instead of the table, so the header vanishes. And
	 * even a populated column is useless for an ordering assertion if every row
	 * holds the same value. Row-order assertions run on this column only; the
	 * per-column `orderBy` *param* check still covers all of them.
	 */
	orderByColumnId: string;
	/**
	 * Dataset the row-order assertion seeds. Normally `<entity>_orderby`, but
	 * `hosts_orderby` gives every host identical values for every metric, so hosts
	 * borrows its accuracy fixture instead.
	 */
	orderByDataset: DatasetKey;
	/**
	 * A second, distinct attribute to group on, for the multi-attribute case.
	 * Must exist in the entity's `metricNamespace` — hosts only has
	 * `host.name` / `os.type` / `state`, so it cannot borrow a `k8s.*` key.
	 */
	secondGroupByAttribute: string;
	seed: EntitySeedFacts;
}

// ─── Shared payloads ─────────────────────────────────────────────────────────

const K8S_ROUTE = '/infrastructure-monitoring/kubernetes';
const HOSTS_ROUTE = '/infrastructure-monitoring/hosts';

const K8S_NAMESPACE_ATTR = 'k8s.namespace.name';
const K8S_CLUSTER_ATTR = 'k8s.cluster.name';
const OS_TYPE_ATTR = 'os.type';

/**
 * The Pod Metrics custom tab is identical on every entity that has it
 * (namespaces, deployments, statefulsets, daemonsets, jobs) — see
 * `podUtilizationByPodWidgetInfo`.
 */
export const POD_METRICS_WIDGET_TITLES = [
	'CPU Limit Utilization By Pod Name',
	'CPU Request Utilization By Pod Name',
	'Memory Limit Utilization By Pod Name',
	'Memory Request Utilization By Pod Name',
	'FileSystem Usage Percentage By Pod Name',
];

/** The four utilisation columns every workload entity shares. */
const WORKLOAD_UTILISATION_COLUMNS: EntityColumn[] = [
	{
		id: 'cpu_request',
		header: 'CPU Request Usage (%)',
		hiddenByDefault: true,
		sortable: true,
	},
	{
		id: 'cpu_limit',
		header: 'CPU Limit Usage (%)',
		hiddenByDefault: false,
		sortable: true,
	},
	{
		id: 'cpu',
		header: 'CPU Usage (cores)',
		hiddenByDefault: false,
		sortable: true,
	},
	{
		id: 'memory_request',
		header: 'Memory Request Usage (%)',
		hiddenByDefault: true,
		sortable: true,
	},
	{
		id: 'memory_limit',
		header: 'Memory Limit Usage (%)',
		hiddenByDefault: false,
		sortable: true,
	},
	{
		id: 'memory',
		header: 'Memory Usage (WSS)',
		hiddenByDefault: false,
		sortable: true,
	},
];

/**
 * `WORKLOAD_UTILISATION_COLUMNS` with per-entity default-visibility overrides.
 * `cpu`/`memory` are default-hidden on statefulsets and `cpu` on daemonsets but
 * visible everywhere else — exactly the kind of asymmetry a refactor silently
 * flips, so it is spelled out rather than inherited.
 */
function utilisationColumns(hiddenOverrides: string[] = []): EntityColumn[] {
	return WORKLOAD_UTILISATION_COLUMNS.map((column) =>
		hiddenOverrides.includes(column.id)
			? { ...column, hiddenByDefault: true }
			: { ...column },
	);
}

const ALL_TABS: EntityCapability[] = [
	'tabBar',
	'logsTab',
	'tracesTab',
	'eventsTab',
];

// ─── The registry ────────────────────────────────────────────────────────────

const HOSTS: EntityDef = {
	key: 'hosts',
	label: 'Hosts',
	route: HOSTS_ROUTE,
	columnStorageKey: 'k8s-hosts-columns',
	expandedColumnStorageKey: 'k8s-hosts-columns-expanded',
	pageSizeStorageKey: 'k8s-hosts-preferred-page-size',
	nameColumnId: 'host.name',
	groupColumnId: 'hostGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., host.name = 'web-server-01' AND os.type = 'linux')",
	metricNamespace: 'system.',
	quickFilterTitles: ['Host Name', 'OS Type', 'Environment'],
	quickFilterDefaultOpen: ['Host Name', 'OS Type', 'Environment'],
	metadataLabels: ['STATUS', 'OPERATING SYSTEM', 'CPU USAGE', 'MEMORY USAGE'],
	/** The plan says 8; `hostWidgetInfo` actually has 13. */
	widgetTitles: [
		'CPU Usage',
		'Memory Usage',
		'Disk Usage (%) by mountpoint',
		'System Load Average',
		'Network usage',
		'Network usage (packet/s)',
		'Network errors',
		'Network drops',
		'Network connections',
		'System disk IO',
		'System disk operations/s',
		'Queue size',
		'System disk operation time/s',
	],
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'statusFilter',
		'tabBar',
		'logsTab',
		'tracesTab',
	]),
	selectedItemExtraParams: [],
	groupByAttribute: OS_TYPE_ATTR,
	orderByColumnId: 'load15',
	orderByDataset: 'hosts_value_accuracy',
	secondGroupByAttribute: 'host.name',
	columns: [
		{
			id: 'hostGroup',
			header: 'Host Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'host.name',
			header: 'Hostname',
			hiddenByDefault: false,
			sortable: true,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'status',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'cpu',
			header: 'CPU Usage',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'memory',
			header: 'Memory Usage (WSS)',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'disk_usage',
			header: 'Disk Usage',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'wait',
			header: 'IOWait',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'load15',
			header: 'Load Avg (15min)',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'hosts_value_accuracy',
		grouped: 'hosts_groupby_os_type',
		pagination: 'hosts_pagination',
		filter: 'hosts_filter_dataset',
		orderBy: 'hosts_orderby',
		sampleName: 'acc-h1',
		sampleItemKey: 'acc-h1',
		sampleGroup: 'linux',
	},
};

const PODS: EntityDef = {
	key: 'pods',
	label: 'Pods',
	route: K8S_ROUTE,
	categoryTestId: 'category-pods',
	columnStorageKey: 'k8s-pods-columns',
	expandedColumnStorageKey: 'k8s-pods-columns-expanded',
	pageSizeStorageKey: 'k8s-pods-preferred-page-size',
	nameColumnId: 'k8s.pod.name',
	groupColumnId: 'podGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.namespace.name = 'production' AND k8s.deployment.name = 'api-server')",
	metricNamespace: 'k8s.pod.',
	// Pods is the only entity whose middle sections are collapsed by default, and
	// the only one whose first section is titled `Pod` rather than `<Entity> Name`.
	quickFilterTitles: [
		'Pod',
		'Namespace',
		'Node',
		'Cluster',
		'Deployment',
		'Statefulset',
		'DaemonSet',
		'Job',
		'Environment',
	],
	quickFilterDefaultOpen: ['Pod', 'Environment'],
	metadataLabels: ['NAMESPACE', 'Cluster Name', 'Node'],
	widgetTitles: [
		'CPU Usage (cores)',
		'CPU Request, Limit Utilization',
		'Memory Usage (bytes)',
		'Memory Request, Limit Utilization',
		'Memory by State',
		'Memory Major Page Faults',
		'CPU Usage by Container (cores)',
		'CPU Request, Limit Utilization by Container',
		'Memory Usage by Container (bytes)',
		'Memory Request, Limit Utilization by Container',
		'Network rate',
		'Network errors',
		'File system (bytes)',
	],
	capabilities: new Set<EntityCapability>(['groupBy', ...ALL_TABS]),
	selectedItemExtraParams: [],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'pods_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	columns: [
		{
			id: 'podGroup',
			header: 'Pod Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'k8s.pod.name',
			header: 'Pod Name',
			hiddenByDefault: false,
			sortable: true,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'podStatus',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-expand',
		},
		{
			id: 'podCountsByStatus',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
		},
		{
			id: 'podAge',
			header: 'Age',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'podRestarts',
			header: 'Restarts',
			hiddenByDefault: false,
			sortable: false,
		},
		...utilisationColumns(),
		{
			id: 'namespace',
			header: 'Namespace',
			hiddenByDefault: true,
			sortable: false,
		},
		{ id: 'node', header: 'Node', hiddenByDefault: true, sortable: false },
		{ id: 'cluster', header: 'Cluster', hiddenByDefault: true, sortable: false },
	],
	seed: {
		primary: 'pods_value_accuracy',
		grouped: 'pods_groupby',
		pagination: 'pods_pagination',
		filter: 'pods_filter_dataset',
		orderBy: 'pods_orderby',
		sampleName: 'acc-p1',
		// `getK8sPodItemKey` returns `pod.podUID`, so a pod deep link and
		// `copy-id-button` both carry the UID while the drawer title shows the name.
		sampleItemKey: 'acc-p1-uid',
		sampleGroup: 'gns-a',
	},
};

const NODES: EntityDef = {
	key: 'nodes',
	label: 'Nodes',
	route: K8S_ROUTE,
	categoryTestId: 'category-nodes',
	columnStorageKey: 'k8s-nodes-columns',
	expandedColumnStorageKey: 'k8s-nodes-columns-expanded',
	pageSizeStorageKey: 'k8s-nodes-preferred-page-size',
	nameColumnId: 'k8s.node.name',
	groupColumnId: 'nodeGroup',
	capabilities: new Set<EntityCapability>(['groupBy', ...ALL_TABS]),
	selectedItemExtraParams: [],
	groupByAttribute: K8S_CLUSTER_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'nodes_orderby',
	secondGroupByAttribute: 'k8s.node.name',
	seed: {
		primary: 'nodes_value_accuracy',
		grouped: 'nodes_groupby',
		pagination: 'nodes_pagination',
		filter: 'nodes_filter_dataset',
		orderBy: 'nodes_orderby',
		sampleName: 'acc-n1',
		sampleItemKey: 'acc-n1',
		sampleGroup: 'gb-cluster-a',
	},
};

const NAMESPACES: EntityDef = {
	key: 'namespaces',
	label: 'Namespaces',
	route: K8S_ROUTE,
	categoryTestId: 'category-namespaces',
	columnStorageKey: 'k8s-namespaces-columns',
	expandedColumnStorageKey: 'k8s-namespaces-columns-expanded',
	pageSizeStorageKey: 'k8s-namespaces-preferred-page-size',
	nameColumnId: 'k8s.namespace.name',
	groupColumnId: 'namespaceGroup',
	countsCards: ['Deployments', 'StatefulSets', 'DaemonSets', 'Jobs'],
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'countsCards',
		'podMetricsTab',
		...ALL_TABS,
	]),
	selectedItemExtraParams: ['clusterName'],
	groupByAttribute: K8S_CLUSTER_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'namespaces_orderby',
	secondGroupByAttribute: K8S_NAMESPACE_ATTR,
	seed: {
		primary: 'namespaces_value_accuracy',
		grouped: 'namespaces_groupby',
		pagination: 'namespaces_pagination',
		filter: 'namespaces_filter_dataset',
		orderBy: 'namespaces_orderby',
		sampleName: 'acc-ns-1',
		sampleItemKey: 'acc-ns-1',
		sampleClusterName: 'cluster-x',
		sampleGroup: 'gb-cluster-a',
	},
};

const CLUSTERS: EntityDef = {
	key: 'clusters',
	label: 'Clusters',
	route: K8S_ROUTE,
	categoryTestId: 'category-clusters',
	columnStorageKey: 'k8s-clusters-columns',
	expandedColumnStorageKey: 'k8s-clusters-columns-expanded',
	pageSizeStorageKey: 'k8s-clusters-preferred-page-size',
	nameColumnId: 'k8s.cluster.name',
	groupColumnId: 'clusterGroup',
	countsCards: [
		'Namespaces',
		'Nodes',
		'Deployments',
		'StatefulSets',
		'DaemonSets',
		'Jobs',
	],
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'countsCards',
		...ALL_TABS,
	]),
	selectedItemExtraParams: [],
	groupByAttribute: K8S_CLUSTER_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'clusters_orderby',
	secondGroupByAttribute: K8S_NAMESPACE_ATTR,
	seed: {
		primary: 'clusters_value_accuracy',
		grouped: 'clusters_groupby',
		pagination: 'clusters_pagination',
		filter: 'clusters_filter_dataset',
		orderBy: 'clusters_orderby',
		sampleName: 'acc-cluster-1',
		sampleItemKey: 'acc-cluster-1',
		sampleGroup: 'gb-gcp-1',
	},
};

const DEPLOYMENTS: EntityDef = {
	key: 'deployments',
	label: 'Deployments',
	route: K8S_ROUTE,
	categoryTestId: 'category-deployments',
	columnStorageKey: 'k8s-deployments-columns',
	expandedColumnStorageKey: 'k8s-deployments-columns-expanded',
	pageSizeStorageKey: 'k8s-deployments-preferred-page-size',
	nameColumnId: 'k8s.deployment.name',
	groupColumnId: 'deploymentGroup',
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'podMetricsTab',
		...ALL_TABS,
	]),
	selectedItemExtraParams: ['clusterName', 'namespaceName'],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'deployments_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	seed: {
		primary: 'deployments_value_accuracy',
		grouped: 'deployments_groupby',
		pagination: 'deployments_pagination',
		filter: 'deployments_filter_dataset',
		orderBy: 'deployments_orderby',
		sampleName: 'acc-dep-1',
		sampleItemKey: 'acc-dep-1',
		sampleClusterName: 'cluster-x',
		sampleNamespaceName: 'ns-acc',
		sampleGroup: 'gb-ns-a',
	},
};

const STATEFULSETS: EntityDef = {
	key: 'statefulsets',
	label: 'StatefulSets',
	route: K8S_ROUTE,
	categoryTestId: 'category-statefulsets',
	columnStorageKey: 'k8s-statefulsets-columns',
	expandedColumnStorageKey: 'k8s-statefulsets-columns-expanded',
	pageSizeStorageKey: 'k8s-statefulsets-preferred-page-size',
	nameColumnId: 'k8s.statefulset.name',
	groupColumnId: 'statefulSetGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.statefulset.name = 'postgres' AND k8s.namespace.name = 'databases')",
	metricNamespace: 'k8s.',
	quickFilterTitles: [
		'Statefulset Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	quickFilterDefaultOpen: [
		'Statefulset Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	metadataLabels: ['Statefulset Name', 'Cluster Name', 'Namespace Name'],
	widgetTitles: [
		'CPU usage, request, limits',
		'CPU request, limit util (%)',
		'Memory usage, request, limits',
		'Memory request, limit util (%)',
		'Network IO',
		'Network errors count',
	],
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'podMetricsTab',
		...ALL_TABS,
	]),
	selectedItemExtraParams: ['clusterName', 'namespaceName'],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'cpu_limit',
	orderByDataset: 'statefulsets_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	columns: [
		{
			id: 'statefulSetGroup',
			header: 'StatefulSet Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'k8s.statefulset.name',
			header: 'StatefulSet Name',
			hiddenByDefault: false,
			sortable: true,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'namespaceName',
			header: 'Namespace',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'pod_counts_by_status',
			header: 'Pod Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'pod_replicas',
			header: 'Pod Replicas',
			hiddenByDefault: false,
			sortable: false,
		},
		// `cpu` and `memory` are default-hidden here but visible on every other
		// workload entity — guarded deliberately.
		...utilisationColumns(['cpu', 'memory']),
		{
			id: 'current_pods',
			header: 'Current Pods',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'desired_pods',
			header: 'Desired Pods',
			hiddenByDefault: true,
			sortable: true,
		},
	],
	seed: {
		primary: 'statefulsets_value_accuracy',
		grouped: 'statefulsets_groupby',
		pagination: 'statefulsets_pagination',
		filter: 'statefulsets_filter_dataset',
		orderBy: 'statefulsets_orderby',
		sampleName: 'acc-ss-1',
		sampleItemKey: 'acc-ss-1',
		sampleClusterName: 'cluster-x',
		sampleNamespaceName: 'ns-acc',
		sampleGroup: 'gb-ns-a',
	},
};

const DAEMONSETS: EntityDef = {
	key: 'daemonsets',
	label: 'DaemonSets',
	route: K8S_ROUTE,
	categoryTestId: 'category-daemonsets',
	columnStorageKey: 'k8s-daemonsets-columns',
	expandedColumnStorageKey: 'k8s-daemonsets-columns-expanded',
	pageSizeStorageKey: 'k8s-daemonsets-preferred-page-size',
	nameColumnId: 'k8s.daemonset.name',
	groupColumnId: 'daemonSetGroup',
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'podMetricsTab',
		...ALL_TABS,
	]),
	selectedItemExtraParams: ['clusterName', 'namespaceName'],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'cpu_limit',
	orderByDataset: 'daemonsets_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	seed: {
		primary: 'daemonsets_value_accuracy',
		grouped: 'daemonsets_groupby',
		pagination: 'daemonsets_pagination',
		filter: 'daemonsets_filter_dataset',
		orderBy: 'daemonsets_orderby',
		sampleName: 'acc-ds-1',
		sampleItemKey: 'acc-ds-1',
		sampleClusterName: 'cluster-x',
		sampleNamespaceName: 'ns-acc',
		sampleGroup: 'gb-ns-a',
	},
};

const JOBS: EntityDef = {
	key: 'jobs',
	label: 'Jobs',
	route: K8S_ROUTE,
	categoryTestId: 'category-jobs',
	columnStorageKey: 'k8s-jobs-columns',
	expandedColumnStorageKey: 'k8s-jobs-columns-expanded',
	pageSizeStorageKey: 'k8s-jobs-preferred-page-size',
	nameColumnId: 'k8s.job.name',
	groupColumnId: 'jobGroup',
	capabilities: new Set<EntityCapability>([
		'groupBy',
		'podMetricsTab',
		...ALL_TABS,
	]),
	selectedItemExtraParams: ['clusterName', 'namespaceName'],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'jobs_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	seed: {
		primary: 'jobs_value_accuracy',
		grouped: 'jobs_groupby',
		pagination: 'jobs_pagination',
		filter: 'jobs_filter_dataset',
		orderBy: 'jobs_orderby',
		sampleName: 'acc-job-1',
		sampleItemKey: 'acc-job-1',
		sampleClusterName: 'cluster-x',
		sampleNamespaceName: 'ns-acc',
		sampleGroup: 'gb-ns-a',
	},
};

const VOLUMES: EntityDef = {
	key: 'volumes',
	label: 'Volumes',
	route: K8S_ROUTE,
	categoryTestId: 'category-volumes',
	columnStorageKey: 'k8s-volumes-columns',
	expandedColumnStorageKey: 'k8s-volumes-columns-expanded',
	pageSizeStorageKey: 'k8s-volumes-preferred-page-size',
	nameColumnId: 'k8s.persistentvolumeclaim.name',
	groupColumnId: 'volumeGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.persistentvolumeclaim.name = 'data-pvc' AND k8s.namespace.name = 'storage')",
	metricNamespace: 'k8s.volume.',
	quickFilterTitles: [
		'PVC Volume Claim Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	quickFilterDefaultOpen: [
		'PVC Volume Claim Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	metadataLabels: ['PVC Name', 'Cluster Name', 'Namespace Name'],
	widgetTitles: [
		'Volume available',
		'Volume capacity',
		'Volume inodes used',
		'Volume inodes',
		'Volume inodes free',
	],
	// `hideDetailViewTabs` — no tab bar, and no logs/traces/events at all.
	capabilities: new Set<EntityCapability>(['groupBy']),
	selectedItemExtraParams: ['clusterName', 'namespaceName'],
	groupByAttribute: K8S_NAMESPACE_ATTR,
	orderByColumnId: 'capacity',
	orderByDataset: 'volumes_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	columns: [
		{
			id: 'volumeGroup',
			header: 'Volume Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'k8s.persistentvolumeclaim.name',
			header: 'PVC Name',
			hiddenByDefault: false,
			sortable: true,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'namespaceName',
			header: 'Namespace',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'capacity',
			header: 'Capacity',
			hiddenByDefault: false,
			sortable: true,
		},
		{ id: 'usage', header: 'Used', hiddenByDefault: false, sortable: true },
		{
			id: 'available',
			header: 'Available',
			hiddenByDefault: false,
			sortable: true,
		},
		{ id: 'inodes', header: 'Inodes', hiddenByDefault: false, sortable: true },
		{
			id: 'inodes_used',
			header: 'Inodes Used',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'inodes_free',
			header: 'Inodes Free',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'volumes_value_accuracy',
		grouped: 'volumes_groupby',
		pagination: 'volumes_pagination',
		filter: 'volumes_filter_dataset',
		orderBy: 'volumes_orderby',
		sampleName: 'acc-pvc-1',
		sampleItemKey: 'acc-pvc-1',
		sampleClusterName: 'cluster-x',
		sampleNamespaceName: 'ns-acc',
		sampleGroup: 'gb-ns-a',
	},
};

/**
 * Registry order. This is **not** the left-rail order a user sees — see
 * {@link K8S_CATEGORY_TAB_ORDER} for that.
 *
 * `K8sCategories.CONTAINERS` exists in the enum and `kube_containers_*`
 * fixtures exist, but there is no entity config and no tab, so containers is
 * deliberately absent. Add it here the day the tab ships.
 */
export const ENTITIES: EntityDef[] = [
	HOSTS,
	PODS,
	NODES,
	NAMESPACES,
	CLUSTERS,
	DEPLOYMENTS,
	STATEFULSETS,
	DAEMONSETS,
	JOBS,
	VOLUMES,
];

/** `ENTITIES` minus hosts — the nine that live on the kubernetes route. */
export const K8S_ENTITIES: EntityDef[] = ENTITIES.filter(
	(entity) => entity.key !== 'hosts',
);

/** Left-rail tab order, exactly as a user sees it. */
export const K8S_CATEGORY_TAB_ORDER = [
	'pods',
	'nodes',
	'namespaces',
	'clusters',
	'deployments',
	'jobs',
	'daemonsets',
	'statefulsets',
	'volumes',
];

export const K8S_PATH = K8S_ROUTE;
export const HOSTS_PATH = HOSTS_ROUTE;

export function entityByKey(key: string): EntityDef {
	const entity = ENTITIES.find((candidate) => candidate.key === key);
	if (!entity) {
		throw new Error(`unknown infra-monitoring entity: ${key}`);
	}
	return entity;
}

// `entitiesWith(capability)` used to live here. It is `fanOut('all', capability)`
// with no empty-result guard, and had no callers — two ways to say the same
// thing, one of which silently declares zero tests.

/**
 * A mirrored field, or a failure that names the entity and the field.
 *
 * The mirror is kept only for the entities a `once`- or `representative`-level
 * scenario runs on, so widening a scenario to one of the other six reads
 * `undefined`. Left alone, `columns` would filter to `[]` and every column
 * assertion would pass against nothing. Same silent hole `fanOut`'s
 * empty-selection throw closes, in the other direction.
 */
export function mirrored<Field extends keyof EntityDef>(
	entity: EntityDef,
	field: Field,
): NonNullable<EntityDef[Field]> {
	const value = entity[field];
	if (value == null) {
		throw new Error(
			`${entity.key} does not mirror '${String(field)}': the field is kept only for the ` +
				`entities a 'once'- or 'representative'-level scenario runs on. Narrow the ` +
				`scenario, or add the field back for this one entity and say why.`,
		);
	}
	return value as NonNullable<EntityDef[Field]>;
}

export function defaultVisibleColumns(entity: EntityDef): EntityColumn[] {
	return mirrored(entity, 'columns').filter(
		(column) =>
			!column.hiddenByDefault && column.visibility !== 'hidden-on-collapse',
	);
}

export function hiddenByDefaultColumns(entity: EntityDef): EntityColumn[] {
	return mirrored(entity, 'columns').filter((column) => column.hiddenByDefault);
}

export function sortableColumns(entity: EntityDef): EntityColumn[] {
	return mirrored(entity, 'columns').filter((column) => column.sortable);
}

/**
 * Columns the options panel lists. It omits `hidden-on-collapse` columns, so the
 * group column never appears.
 */
export function optionsPanelColumns(entity: EntityDef): EntityColumn[] {
	return mirrored(entity, 'columns').filter(
		(column) => column.visibility !== 'hidden-on-collapse',
	);
}

// ─── Fan-out tiering (§4.0 of the plan) ──────────────────────────────────────

/**
 * The four entities that span every axis `K8sBaseList`/`K8sBaseDetails` branch
 * on, so a `representative`-level scenario covers the same ground as `all` for a
 * fraction of the wall-clock:
 *
 * - **hosts** — the other route, no category rail, `leftFilters` (StatusFilter),
 *   `showEvents: false`
 * - **pods** — bare-string `getItemKey` where the UID is not the name, the widest
 *   column set, collapsed quick filters
 * - **statefulsets** — `SelectedItemParams` with cluster *and* namespace, a custom
 *   Pod Metrics tab, and the `cpu`/`memory` default-hidden asymmetry
 * - **volumes** — `hideDetailViewTabs`, so no tab bar and no logs/traces/events
 */
export const REPRESENTATIVE_KEYS = ['hosts', 'pods', 'statefulsets', 'volumes'];

export const REPRESENTATIVE_ENTITIES: EntityDef[] =
	REPRESENTATIVE_KEYS.map(entityByKey);

/** The single entity a `once`-level scenario runs on. */
export const ONCE_ENTITY = PODS;

/**
 * Tag applied to `all`-level describes so CI can run `--grep-invert @wide` on
 * PRs and the full matrix nightly.
 */
export const WIDE_TAG = '@wide';

export type FanOut = 'once' | 'representative' | 'all';

/**
 * The entities a scenario at `level` runs on, intersected with `capability`
 * when the scenario is capability-gated.
 */
export function fanOut(
	level: FanOut,
	capability?: EntityCapability,
): EntityDef[] {
	const pool =
		level === 'once'
			? [ONCE_ENTITY]
			: level === 'representative'
				? REPRESENTATIVE_ENTITIES
				: ENTITIES;
	const selected = capability
		? pool.filter((entity) => entity.capabilities.has(capability))
		: pool;
	// A spec's `for (const entity of fanOut(...))` declares no `test()` at all for
	// an empty result and the file reports green — a whole scenario can vanish
	// because a capability was renamed, with nothing in the output to say so.
	// `fanOut('representative', 'countsCards')` and `fanOut('once', 'statusFilter')`
	// are both empty today, which is exactly the trap.
	if (selected.length === 0) {
		throw new Error(
			`fanOut('${level}'${capability ? `, '${capability}'` : ''}) selected no entities — ` +
				`the scenario would silently declare zero tests. Widen the level or check the capability name.`,
		);
	}
	return selected;
}
