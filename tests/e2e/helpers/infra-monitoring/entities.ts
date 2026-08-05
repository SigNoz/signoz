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
	/** `ColumnHeader`/`EntityGroupHeader` docPath, when the column carries one. */
	docPath?: string;
	visibility?: 'hidden-on-expand' | 'hidden-on-collapse';
	pinned?: 'left' | 'right';
	/** `enableRemove: false` — the switch in the options panel is disabled. */
	required?: boolean;
}

/** Extra `selectedItem*` params an entity's `getItemKey` writes to the URL. */
export type SelectedItemExtra = 'clusterName' | 'namespaceName';

export interface EntitySeedFacts {
	/** Dataset covering a happy-path list. */
	primary: string;
	/** Dataset whose group membership the group-by / expanded-row specs use. */
	grouped: string;
	pagination: string;
	orderBy: string;
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
	columns: EntityColumn[];
	nameColumnId: string;
	groupColumnId: string;
	/** `ENTITY_FILTER_PLACEHOLDERS[key]`, verbatim. */
	filterPlaceholder: string;
	/** `METRIC_NAMESPACE_BY_ENTITY[key]`. */
	metricNamespace: string;
	/** Quick-filter section titles, in order. */
	quickFilterTitles: string[];
	/** The subset of `quickFilterTitles` with `defaultOpen: true`. */
	quickFilterDefaultOpen: string[];
	/** Drawer metadata row labels, in order — casing is deliberately verbatim. */
	metadataLabels: string[];
	/** Metrics-tab `chart-header` titles, in order. */
	widgetTitles: string[];
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
	 * fixture — sorting by `podRestarts`, say, returns an empty list, and an empty
	 * list renders the empty state instead of the table, so the header vanishes. And
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
	orderByDataset: string;
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
	nameColumnId: 'hostName',
	groupColumnId: 'hostGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., host.name = 'web-server-01' AND os.type = 'linux')",
	metricNamespace: 'system.',
	quickFilterTitles: ['Host Name', 'OS Type', 'Environment'],
	quickFilterDefaultOpen: ['Host Name', 'OS Type', 'Environment'],
	metadataLabels: ['STATUS', 'OPERATING SYSTEM', 'CPU USAGE', 'MEMORY USAGE'],
	widgetTitles: [
		'CPU Usage',
		'Memory Usage',
		'Disk Usage (%) by mountpoint',
		'System Load Average',
		'Network usage (bytes)',
		'Network usage (packet/s)',
		'Network errors',
		'Network drops',
		'Network connections',
		'System disk io (bytes transferred)',
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
			id: 'hostName',
			header: 'Hostname',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/host-monitoring#hostname',
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'status',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/host-monitoring#status',
		},
		{
			id: 'cpu',
			header: 'CPU Usage',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/host-monitoring#cpu-usage',
		},
		{
			id: 'memory',
			header: 'Memory Usage (WSS)',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/host-monitoring#memory-usage',
		},
		{
			id: 'diskUsage',
			header: 'Disk Usage',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/host-monitoring#disk-usage',
		},
		{
			id: 'wait',
			header: 'IOWait',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/host-monitoring#iowait',
		},
		{
			id: 'load15',
			header: 'Load Avg (15min)',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/host-monitoring#load-avg',
		},
	],
	seed: {
		primary: 'hosts_value_accuracy',
		grouped: 'hosts_groupby_os_type',
		pagination: 'hosts_pagination',
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
	nameColumnId: 'podName',
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
			id: 'podName',
			header: 'Pod Name',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/kubernetes/pods#pod-name',
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'podStatus',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/kubernetes/pods#pod-status',
			visibility: 'hidden-on-expand',
		},
		{
			id: 'podCountsByStatus',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/kubernetes/pods#pod-status',
			visibility: 'hidden-on-collapse',
		},
		{
			id: 'podAge',
			header: 'Age',
			hiddenByDefault: false,
			sortable: false,
			docPath: '/infrastructure-monitoring/kubernetes/pods#pod-age',
		},
		{
			id: 'podRestarts',
			header: 'Restarts',
			hiddenByDefault: false,
			sortable: true,
			docPath: '/infrastructure-monitoring/kubernetes/pods#restarts',
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
	nameColumnId: 'nodeName',
	groupColumnId: 'nodeGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.node.name = 'node-01' AND k8s.cluster.name = 'prod-cluster')",
	metricNamespace: 'k8s.node.',
	quickFilterTitles: ['Node Name', 'Cluster Name', 'Environment'],
	quickFilterDefaultOpen: ['Node Name', 'Cluster Name', 'Environment'],
	metadataLabels: ['Node Name', 'Cluster Name'],
	widgetTitles: [
		'CPU Usage (cores)',
		'Memory Usage (bytes)',
		'CPU Usage (%)',
		'Memory Usage (%)',
		'Pods by CPU (top 10)',
		'Pods by Memory (top 10)',
		'Network error count',
		'Network IO rate',
		'Filesystem usage (bytes)',
		'Filesystem usage (%)',
	],
	capabilities: new Set<EntityCapability>(['groupBy', ...ALL_TABS]),
	selectedItemExtraParams: [],
	groupByAttribute: K8S_CLUSTER_ATTR,
	orderByColumnId: 'cpu',
	orderByDataset: 'nodes_orderby',
	secondGroupByAttribute: 'k8s.node.name',
	columns: [
		{
			id: 'nodeGroup',
			header: 'Node Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'nodeName',
			header: 'Node Name',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'condition',
			header: 'Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'podCountsByStatus',
			header: 'Pod Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'clusterName',
			header: 'Cluster Name',
			hiddenByDefault: true,
			sortable: false,
		},
		{
			id: 'cpu',
			header: 'CPU Usage (cores)',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'cpu_allocatable',
			header: 'CPU Allocatable (cores)',
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
			id: 'memory_allocatable',
			header: 'Memory Allocatable',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'nodes_value_accuracy',
		grouped: 'nodes_groupby',
		pagination: 'nodes_pagination',
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
	nameColumnId: 'namespaceName',
	groupColumnId: 'namespaceGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.namespace.name = 'production' AND k8s.cluster.name = 'prod-cluster')",
	metricNamespace: 'k8s.pod.',
	quickFilterTitles: ['Namespace Name', 'Cluster Name', 'Environment'],
	quickFilterDefaultOpen: ['Namespace Name', 'Cluster Name', 'Environment'],
	metadataLabels: ['Namespace Name', 'Cluster Name'],
	widgetTitles: [
		'CPU Usage (cores)',
		'Memory Usage (bytes)',
		'Pods CPU (top 10)',
		'Pods Memory (top 10)',
		'Network rate',
		'Network errors',
		'StatefulSets (pods)',
		'ReplicaSets (pods)',
		'DaemonSets (nodes)',
		'Deployments (pods)',
	],
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
	columns: [
		{
			id: 'namespaceGroup',
			header: 'Namespace Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'namespaceName',
			header: 'Namespace Name',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'clusterName',
			header: 'Cluster Name',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'podCountsByStatus',
			header: 'Pod Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'cpu',
			header: 'CPU Usage (cores)',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'memory',
			header: 'Memory Usage (WSS)',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'namespaces_value_accuracy',
		grouped: 'namespaces_groupby',
		pagination: 'namespaces_pagination',
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
	nameColumnId: 'clusterName',
	groupColumnId: 'clusterGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.cluster.name = 'prod-cluster' AND deployment.environment = 'production')",
	metricNamespace: 'k8s.node.',
	quickFilterTitles: ['Cluster Name', 'Environment'],
	quickFilterDefaultOpen: ['Cluster Name', 'Environment'],
	metadataLabels: ['Cluster Name'],
	widgetTitles: [
		'CPU Usage, allocatable',
		'Memory Usage, allocatable',
		'Ready Nodes',
		'NotReady Nodes',
		'Deployments available and desired',
		'Statefulset pods',
		'Daemonset nodes',
		'Jobs',
	],
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
	columns: [
		{
			id: 'clusterGroup',
			header: 'Cluster Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'clusterName',
			header: 'Cluster Name',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-expand',
			pinned: 'left',
			required: true,
		},
		{
			id: 'nodeCountsByReadiness',
			header: 'Node Readiness',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'podCountsByStatus',
			header: 'Pod Status',
			hiddenByDefault: false,
			sortable: false,
		},
		{
			id: 'cpu',
			header: 'CPU Usage (cores)',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'cpu_allocatable',
			header: 'CPU Allocatable (cores)',
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
			id: 'memory_allocatable',
			header: 'Memory Allocatable',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'clusters_value_accuracy',
		grouped: 'clusters_groupby',
		pagination: 'clusters_pagination',
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
	nameColumnId: 'deploymentName',
	groupColumnId: 'deploymentGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.deployment.name = 'api-server' AND k8s.namespace.name = 'production')",
	metricNamespace: 'k8s.',
	quickFilterTitles: [
		'Deployment Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	quickFilterDefaultOpen: [
		'Deployment Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	metadataLabels: ['Deployment Name', 'Cluster Name', 'Namespace Name'],
	widgetTitles: [
		'CPU usage, request, limits',
		'Memory usage, request, limits',
		'Network IO',
		'Network error count',
	],
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
	columns: [
		{
			id: 'deploymentGroup',
			header: 'Deployment Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'deploymentName',
			header: 'Deployment Name',
			hiddenByDefault: false,
			sortable: false,
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
			id: 'podCountsByStatus',
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
		...utilisationColumns(),
		{
			id: 'available_pods',
			header: 'Available Pods',
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
		primary: 'deployments_value_accuracy',
		grouped: 'deployments_groupby',
		pagination: 'deployments_pagination',
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
	nameColumnId: 'statefulsetName',
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
			id: 'statefulsetName',
			header: 'StatefulSet Name',
			hiddenByDefault: false,
			sortable: false,
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
	nameColumnId: 'daemonsetName',
	groupColumnId: 'daemonSetGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.daemonset.name = 'fluentd' AND k8s.namespace.name = 'logging')",
	metricNamespace: 'k8s.',
	quickFilterTitles: [
		'DaemonSet Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	quickFilterDefaultOpen: [
		'DaemonSet Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	metadataLabels: ['Daemonset Name', 'Cluster Name', 'Namespace Name'],
	widgetTitles: [
		'CPU usage, request, limits',
		'Memory usage, request, limits',
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
	orderByDataset: 'daemonsets_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	columns: [
		{
			id: 'daemonSetGroup',
			header: 'DaemonSet Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'daemonsetName',
			header: 'DaemonSet Name',
			hiddenByDefault: false,
			sortable: false,
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
			id: 'scheduled_nodes',
			header: 'Scheduled Nodes',
			hiddenByDefault: false,
			sortable: false,
		},
		// `cpu` is default-hidden here but visible on every other workload entity.
		...utilisationColumns(['cpu']),
		{
			id: 'ready_nodes',
			header: 'Ready Nodes',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'current_nodes',
			header: 'Current Nodes',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'desired_nodes',
			header: 'Desired Nodes',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'misscheduled_nodes',
			header: 'Misscheduled Nodes',
			hiddenByDefault: true,
			sortable: true,
		},
	],
	seed: {
		primary: 'daemonsets_value_accuracy',
		grouped: 'daemonsets_groupby',
		pagination: 'daemonsets_pagination',
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
	nameColumnId: 'jobName',
	groupColumnId: 'jobGroup',
	filterPlaceholder:
		"Enter your filter query (e.g., k8s.job.name = 'backup-job' AND k8s.namespace.name = 'cron-jobs')",
	metricNamespace: 'k8s.',
	quickFilterTitles: [
		'Job Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	quickFilterDefaultOpen: [
		'Job Name',
		'Namespace Name',
		'Cluster Name',
		'Environment',
	],
	metadataLabels: ['Job Name', 'Cluster Name', 'Namespace Name'],
	widgetTitles: [
		'CPU usage',
		'Memory Usage',
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
	orderByColumnId: 'cpu',
	orderByDataset: 'jobs_orderby',
	secondGroupByAttribute: K8S_CLUSTER_ATTR,
	columns: [
		{
			id: 'jobGroup',
			header: 'Job Group',
			hiddenByDefault: false,
			sortable: false,
			visibility: 'hidden-on-collapse',
			pinned: 'left',
			required: true,
		},
		{
			id: 'jobName',
			header: 'Job Name',
			hiddenByDefault: false,
			sortable: false,
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
			id: 'completion',
			header: 'Completions',
			hiddenByDefault: false,
			sortable: false,
		},
		...utilisationColumns(),
		{
			id: 'active_pods',
			header: 'Active Pods',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'failed_pods',
			header: 'Failed Pods',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'successful_pods',
			header: 'Successful Pods',
			hiddenByDefault: true,
			sortable: true,
		},
		{
			id: 'desired_successful_pods',
			header: 'Desired Successful Pods',
			hiddenByDefault: true,
			sortable: true,
		},
	],
	seed: {
		primary: 'jobs_value_accuracy',
		grouped: 'jobs_groupby',
		pagination: 'jobs_pagination',
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
	nameColumnId: 'pvcName',
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
			id: 'pvcName',
			header: 'PVC Name',
			hiddenByDefault: false,
			sortable: false,
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
			id: 'inodesUsed',
			header: 'Inodes Used',
			hiddenByDefault: false,
			sortable: true,
		},
		{
			id: 'inodesFree',
			header: 'Inodes Free',
			hiddenByDefault: false,
			sortable: true,
		},
	],
	seed: {
		primary: 'volumes_value_accuracy',
		grouped: 'volumes_groupby',
		pagination: 'volumes_pagination',
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

export function entitiesWith(capability: EntityCapability): EntityDef[] {
	return ENTITIES.filter((entity) => entity.capabilities.has(capability));
}

export function defaultVisibleColumns(entity: EntityDef): EntityColumn[] {
	return entity.columns.filter(
		(column) =>
			!column.hiddenByDefault && column.visibility !== 'hidden-on-collapse',
	);
}

export function hiddenByDefaultColumns(entity: EntityDef): EntityColumn[] {
	return entity.columns.filter((column) => column.hiddenByDefault);
}

export function sortableColumns(entity: EntityDef): EntityColumn[] {
	return entity.columns.filter((column) => column.sortable);
}

/**
 * Columns the options panel lists. It omits `hidden-on-collapse` columns, so the
 * group column never appears.
 */
export function optionsPanelColumns(entity: EntityDef): EntityColumn[] {
	return entity.columns.filter(
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
	return capability
		? pool.filter((entity) => entity.capabilities.has(capability))
		: pool;
}
