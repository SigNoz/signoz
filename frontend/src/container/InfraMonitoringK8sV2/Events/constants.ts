import { INFRA_MONITORING_ATTR_KEYS, K8sCategories } from '../constants';

/**
 * Kubernetes events reach SigNoz as logs, so an unfiltered cluster-wide view
 * would return every log line. This narrows it to event-shaped records, and
 * doubles as the non-empty expression `useEntityEvents` requires to fire.
 */
export const K8S_EVENTS_BASE_EXPRESSION = `${INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_KIND} EXISTS`;

export const K8S_EVENTS_EXPRESSION_KEY = 'k8sEventsExpression';
export const K8S_EVENTS_PAGINATION_KEY = 'k8sEventsPagination';

export const K8S_EVENTS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const K8S_EVENTS_FILTER_PLACEHOLDER =
	"Enter your filter query (e.g., severity_text = 'WARNING' AND k8s.object.kind = 'Pod')";

/**
 * `involvedObject.kind` values that map onto a category with a details drawer.
 * Kinds absent here (ReplicaSet, Endpoints, HorizontalPodAutoscaler…) still
 * list, they just aren't clickable.
 */
export const EVENT_KIND_TO_CATEGORY: Record<string, string> = {
	Pod: K8sCategories.PODS,
	Node: K8sCategories.NODES,
	Namespace: K8sCategories.NAMESPACES,
	Deployment: K8sCategories.DEPLOYMENTS,
	StatefulSet: K8sCategories.STATEFULSETS,
	DaemonSet: K8sCategories.DAEMONSETS,
	Job: K8sCategories.JOBS,
	CronJob: K8sCategories.JOBS,
	PersistentVolumeClaim: K8sCategories.VOLUMES,
};
