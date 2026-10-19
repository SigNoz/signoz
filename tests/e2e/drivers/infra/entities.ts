import type { DatasetKey } from './__generated__/datasets';

/**
 * The infra-monitoring entity registry: the single place a new entity is added.
 *
 * What is **not** here is as deliberate as what is. `K8sBaseList` and
 * `K8sBaseDetails` are entity-agnostic — the only thing that varies is the
 * config object handed to them — so the columns, filter placeholders,
 * quick-filter sections, metadata labels and widget titles are asserted against
 * the product's own config in jest
 * (`frontend/src/container/InfraMonitoringK8sV2/__tests__/entityConfig.test.ts`),
 * not mirrored here and re-checked through a browser ten times over.
 *
 * What stays is what an E2E needs to *drive* the page: where an entity lives,
 * what its rows are keyed by, what it can be grouped or sorted by, and which
 * dataset seeds each scenario.
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

/** Extra `selectedItem*` params an entity's `getItemKey` writes to the URL. */
export type SelectedItemExtra = 'clusterName' | 'namespaceName';

export interface EntitySeedFacts {
	/** Dataset covering a happy-path list. */
	primary: DatasetKey;
	/** Dataset whose group membership the group-by and expanded-row specs use. */
	grouped: DatasetKey;
	pagination: DatasetKey;
	orderBy: DatasetKey;
	/**
	 * Dataset whose rows differ in the attributes the quick-filter rail and the
	 * expression editor filter on, so a filter can actually narrow the list.
	 * `pagination` cannot: its rows are near-identical by construction.
	 */
	filter: DatasetKey;
	/** One row's name, for row-scoped locators. */
	sampleName: string;
	/** What `selectedItem` takes for `sampleName` — pods key rows by UID. */
	sampleItemKey: string;
	sampleClusterName?: string;
	sampleNamespaceName?: string;
	/** One group label from `grouped`, under `groupByAttribute`. */
	sampleGroup: string;
}

export interface EntityDef {
	/** `category` param value, storage-key segment and registry key. */
	key: string;
	label: string;
	route: string;
	/** `category-<key>` in the left rail; absent for hosts, which has no rail. */
	categoryTestId?: string;
	columnStorageKey: string;
	expandedColumnStorageKey: string;
	pageSizeStorageKey: string;
	nameColumnId: string;
	groupColumnId: string;
	capabilities: Set<EntityCapability>;
	selectedItemExtraParams: SelectedItemExtra[];
	groupByAttribute: string;
	/**
	 * A second, distinct attribute to group on. Must exist in the entity's own
	 * metric namespace — hosts has only `host.name` / `os.type` / `state`, so it
	 * cannot borrow a `k8s.*` key.
	 */
	secondGroupByAttribute: string;
	/**
	 * A sortable, default-visible column whose values vary across the rows of
	 * {@link EntityDef.orderByDataset}.
	 *
	 * Needed twice over: not every sortable column has a backing metric in the
	 * fixture, and sorting by one that does not returns an empty list, which
	 * swaps the table for the empty state and takes the header with it. A
	 * populated column is still useless for an ordering assertion if every row
	 * holds the same value.
	 */
	orderByColumnId: string;
	/**
	 * Dataset the row-order assertion seeds. Normally `<entity>_orderby`, but
	 * `hosts_orderby` gives every host identical values for every metric, so
	 * hosts borrows its accuracy fixture instead.
	 */
	orderByDataset: DatasetKey;
	seed: EntitySeedFacts;
}

const K8S_ROUTE = '/infrastructure-monitoring/kubernetes';
const HOSTS_ROUTE = '/infrastructure-monitoring/hosts';

const NAMESPACE_ATTR = 'k8s.namespace.name';
const CLUSTER_ATTR = 'k8s.cluster.name';
const OS_TYPE_ATTR = 'os.type';

const ALL_TABS: EntityCapability[] = [
	'tabBar',
	'logsTab',
	'tracesTab',
	'eventsTab',
];

/** Storage keys follow one scheme, so they are derived rather than repeated. */
function storageKeys(
	slug: string,
): Pick<
	EntityDef,
	'columnStorageKey' | 'expandedColumnStorageKey' | 'pageSizeStorageKey'
> {
	return {
		columnStorageKey: `k8s-${slug}-columns`,
		expandedColumnStorageKey: `k8s-${slug}-columns-expanded`,
		pageSizeStorageKey: `k8s-${slug}-preferred-page-size`,
	};
}

export const ENTITIES: EntityDef[] = [
	{
		key: 'hosts',
		label: 'Hosts',
		route: HOSTS_ROUTE,
		...storageKeys('hosts'),
		nameColumnId: 'host.name',
		groupColumnId: 'hostGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'statusFilter',
			'tabBar',
			'logsTab',
			'tracesTab',
		]),
		selectedItemExtraParams: [],
		groupByAttribute: OS_TYPE_ATTR,
		secondGroupByAttribute: 'host.name',
		orderByColumnId: 'load15',
		orderByDataset: 'hosts_value_accuracy',
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
	},
	{
		key: 'pods',
		label: 'Pods',
		route: K8S_ROUTE,
		categoryTestId: 'category-pods',
		...storageKeys('pods'),
		nameColumnId: 'k8s.pod.name',
		groupColumnId: 'podGroup',
		capabilities: new Set<EntityCapability>(['groupBy', ...ALL_TABS]),
		selectedItemExtraParams: [],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'cpu',
		orderByDataset: 'pods_orderby',
		seed: {
			primary: 'pods_value_accuracy',
			grouped: 'pods_groupby',
			pagination: 'pods_pagination',
			filter: 'pods_filter_dataset',
			orderBy: 'pods_orderby',
			sampleName: 'acc-p1',
			sampleItemKey: 'acc-p1-uid',
			sampleGroup: 'gns-a',
		},
	},
	{
		key: 'nodes',
		label: 'Nodes',
		route: K8S_ROUTE,
		categoryTestId: 'category-nodes',
		...storageKeys('nodes'),
		nameColumnId: 'k8s.node.name',
		groupColumnId: 'nodeGroup',
		capabilities: new Set<EntityCapability>(['groupBy', ...ALL_TABS]),
		selectedItemExtraParams: [],
		groupByAttribute: CLUSTER_ATTR,
		secondGroupByAttribute: 'k8s.node.name',
		orderByColumnId: 'cpu',
		orderByDataset: 'nodes_orderby',
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
	},
	{
		key: 'namespaces',
		label: 'Namespaces',
		route: K8S_ROUTE,
		categoryTestId: 'category-namespaces',
		...storageKeys('namespaces'),
		nameColumnId: 'k8s.namespace.name',
		groupColumnId: 'namespaceGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'countsCards',
			'podMetricsTab',
			...ALL_TABS,
		]),
		selectedItemExtraParams: ['clusterName'],
		groupByAttribute: CLUSTER_ATTR,
		secondGroupByAttribute: NAMESPACE_ATTR,
		orderByColumnId: 'cpu',
		orderByDataset: 'namespaces_orderby',
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
	},
	{
		key: 'clusters',
		label: 'Clusters',
		route: K8S_ROUTE,
		categoryTestId: 'category-clusters',
		...storageKeys('clusters'),
		nameColumnId: 'k8s.cluster.name',
		groupColumnId: 'clusterGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'countsCards',
			...ALL_TABS,
		]),
		selectedItemExtraParams: [],
		groupByAttribute: CLUSTER_ATTR,
		secondGroupByAttribute: NAMESPACE_ATTR,
		orderByColumnId: 'cpu',
		orderByDataset: 'clusters_orderby',
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
	},
	{
		key: 'deployments',
		label: 'Deployments',
		route: K8S_ROUTE,
		categoryTestId: 'category-deployments',
		...storageKeys('deployments'),
		nameColumnId: 'k8s.deployment.name',
		groupColumnId: 'deploymentGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'podMetricsTab',
			...ALL_TABS,
		]),
		selectedItemExtraParams: ['clusterName', 'namespaceName'],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'cpu',
		orderByDataset: 'deployments_orderby',
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
	},
	{
		key: 'statefulsets',
		label: 'StatefulSets',
		route: K8S_ROUTE,
		categoryTestId: 'category-statefulsets',
		...storageKeys('statefulsets'),
		nameColumnId: 'k8s.statefulset.name',
		groupColumnId: 'statefulSetGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'podMetricsTab',
			...ALL_TABS,
		]),
		selectedItemExtraParams: ['clusterName', 'namespaceName'],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'cpu_limit',
		orderByDataset: 'statefulsets_orderby',
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
	},
	{
		key: 'daemonsets',
		label: 'DaemonSets',
		route: K8S_ROUTE,
		categoryTestId: 'category-daemonsets',
		...storageKeys('daemonsets'),
		nameColumnId: 'k8s.daemonset.name',
		groupColumnId: 'daemonSetGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'podMetricsTab',
			...ALL_TABS,
		]),
		selectedItemExtraParams: ['clusterName', 'namespaceName'],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'cpu_limit',
		orderByDataset: 'daemonsets_orderby',
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
	},
	{
		key: 'jobs',
		label: 'Jobs',
		route: K8S_ROUTE,
		categoryTestId: 'category-jobs',
		...storageKeys('jobs'),
		nameColumnId: 'k8s.job.name',
		groupColumnId: 'jobGroup',
		capabilities: new Set<EntityCapability>([
			'groupBy',
			'podMetricsTab',
			...ALL_TABS,
		]),
		selectedItemExtraParams: ['clusterName', 'namespaceName'],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'cpu',
		orderByDataset: 'jobs_orderby',
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
	},
	{
		key: 'volumes',
		label: 'Volumes',
		route: K8S_ROUTE,
		categoryTestId: 'category-volumes',
		...storageKeys('volumes'),
		nameColumnId: 'k8s.persistentvolumeclaim.name',
		groupColumnId: 'volumeGroup',
		capabilities: new Set<EntityCapability>(['groupBy']),
		selectedItemExtraParams: ['clusterName', 'namespaceName'],
		groupByAttribute: NAMESPACE_ATTR,
		secondGroupByAttribute: CLUSTER_ATTR,
		orderByColumnId: 'capacity',
		orderByDataset: 'volumes_orderby',
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
	},
];

export const K8S_PATH = K8S_ROUTE;
export const HOSTS_PATH = HOSTS_ROUTE;

/**
 * Rail order, as `InfraMonitoringK8s` renders it. Hosts has no rail entry.
 * Containers has a rail entry but no entity here: no spec seeds it.
 */
export const K8S_CATEGORY_TAB_ORDER = [
	'containers',
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

/** A rail button: what category switching needs from an entity. */
export type K8sCategory = Pick<EntityDef, 'key' | 'categoryTestId'>;

/** `DEFAULT_K8S_CATEGORY`: what a route with no `category` param shows. */
export const DEFAULT_CATEGORY: K8sCategory = {
	key: 'containers',
	categoryTestId: 'category-containers',
};

/** `ENTITIES` minus hosts: the ones on the kubernetes route. */
export function k8sEntities(): EntityDef[] {
	return ENTITIES.filter((entity) => Boolean(entity.categoryTestId));
}

export function entityByKey(key: string): EntityDef {
	const entity = ENTITIES.find((candidate) => candidate.key === key);
	if (!entity) {
		throw new Error(
			`unknown infra entity \`${key}\` — known: ${ENTITIES.map((e) => e.key).join(', ')}`,
		);
	}
	return entity;
}

/** The entity the entity-agnostic specs run on. */
export const BASE_ENTITY = entityByKey('pods');
