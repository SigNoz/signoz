import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import { extractQueryPairs } from 'utils/queryContextUtils';

import {
	INFRA_MONITORING_ATTR_KEYS,
	InfraMonitoringEntity,
} from '../constants';

/** The attribute that names one record of a category. */
const PRIMARY_KEY: Record<InfraMonitoringEntity, string> = {
	[InfraMonitoringEntity.CLUSTERS]: INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	[InfraMonitoringEntity.NAMESPACES]:
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	[InfraMonitoringEntity.NODES]: INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
	[InfraMonitoringEntity.PODS]: INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
	[InfraMonitoringEntity.CONTAINERS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME,
	[InfraMonitoringEntity.DEPLOYMENTS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
	[InfraMonitoringEntity.STATEFULSETS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
	[InfraMonitoringEntity.DAEMONSETS]:
		INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
	[InfraMonitoringEntity.JOBS]: INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
	[InfraMonitoringEntity.VOLUMES]:
		INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
	[InfraMonitoringEntity.HOSTS]: INFRA_MONITORING_ATTR_KEYS.HOST_NAME,
};

/**
 * Attributes each list endpoint can be filtered by, broadest first so a built
 * expression reads cluster to container. Only keys the category's metrics
 * actually carry belong here.
 */
const FILTERABLE_KEYS: Record<InfraMonitoringEntity, string[]> = {
	[InfraMonitoringEntity.CLUSTERS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	],
	[InfraMonitoringEntity.NODES]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
	],
	[InfraMonitoringEntity.NAMESPACES]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
	],
	[InfraMonitoringEntity.DEPLOYMENTS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
	],
	[InfraMonitoringEntity.STATEFULSETS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
	],
	[InfraMonitoringEntity.DAEMONSETS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
	],
	[InfraMonitoringEntity.JOBS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
	],
	[InfraMonitoringEntity.VOLUMES]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
		INFRA_MONITORING_ATTR_KEYS.K8S_PERSISTENT_VOLUME_CLAIM_NAME,
	],
	[InfraMonitoringEntity.PODS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
	],
	[InfraMonitoringEntity.CONTAINERS]: [
		INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_NODE_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DEPLOYMENT_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_STATEFULSET_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_DAEMONSET_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_JOB_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
		INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
		INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME,
	],
	[InfraMonitoringEntity.HOSTS]: [],
};

/** Dropdown order: what a resource usually contains, then what contains it. */
const DISPLAY_ORDER: InfraMonitoringEntity[] = [
	InfraMonitoringEntity.PODS,
	InfraMonitoringEntity.CONTAINERS,
	InfraMonitoringEntity.DEPLOYMENTS,
	InfraMonitoringEntity.STATEFULSETS,
	InfraMonitoringEntity.DAEMONSETS,
	InfraMonitoringEntity.JOBS,
	InfraMonitoringEntity.VOLUMES,
	InfraMonitoringEntity.NODES,
	InfraMonitoringEntity.NAMESPACES,
	InfraMonitoringEntity.CLUSTERS,
];

export type EntityAttributes = Record<string, string>;

/** The attribute a category's display name belongs under. */
const NAME_KEY: Partial<Record<InfraMonitoringEntity, string>> = {
	[InfraMonitoringEntity.PODS]: INFRA_MONITORING_ATTR_KEYS.K8S_POD_NAME,
};

export function getEntityNameAttributeKey(
	category: InfraMonitoringEntity,
): string {
	return NAME_KEY[category] ?? PRIMARY_KEY[category];
}

function matchingKeys(
	target: InfraMonitoringEntity,
	attributes: EntityAttributes,
): string[] {
	return FILTERABLE_KEYS[target].filter((key) => !!attributes[key]);
}

/**
 * The single attribute that ties a target to the drawer's resource: the
 * resource itself when the target's records belong to it (the containers of
 * this pod), otherwise the target's own name as the resource knows it (the
 * node this pod runs on).
 */
function relationKey(
	source: InfraMonitoringEntity,
	target: InfraMonitoringEntity,
	attributes: EntityAttributes,
): string | null {
	if (target === source) {
		return null;
	}

	const keys = matchingKeys(target, attributes);

	if (keys.includes(PRIMARY_KEY[source])) {
		return PRIMARY_KEY[source];
	}

	return keys.includes(PRIMARY_KEY[target]) ? PRIMARY_KEY[target] : null;
}

/**
 * A category is related when the drawer's resource either names one of its
 * records (its node, its namespace) or is something its records belong to
 * (the pods on this node). Sharing only a cluster or a namespace is not a
 * relation: it would list everything alongside, not what this resource holds.
 */
export function getRelatedCategories(
	source: InfraMonitoringEntity,
	attributes: EntityAttributes,
): InfraMonitoringEntity[] {
	return DISPLAY_ORDER.filter(
		(target) => !!relationKey(source, target, attributes),
	);
}

/**
 * Cluster and namespace ride along with the relation itself, the way other
 * observability tools scope these lists: a pod's deployment is read as that
 * deployment, in that namespace, in that cluster.
 */
const SCOPE_KEYS = [
	INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME,
	INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
];

export interface RelatedFilterClause {
	key: string;
	value: string;
}

/** Scope clauses, broadest first, so the last one carries the relation. */
export function buildRelatedFilterClauses(
	source: InfraMonitoringEntity,
	target: InfraMonitoringEntity,
	attributes: EntityAttributes,
): RelatedFilterClause[] {
	const key = relationKey(source, target, attributes);

	if (!key) {
		return [];
	}

	const scope = SCOPE_KEYS.filter(
		(scopeKey) =>
			scopeKey !== key &&
			FILTERABLE_KEYS[target].includes(scopeKey) &&
			!!attributes[scopeKey],
	);

	return [...scope, key].map((clauseKey) => ({
		key: clauseKey,
		value: attributes[clauseKey] as string,
	}));
}

export function formatRelatedFilterClause(clause: RelatedFilterClause): string {
	return `${clause.key} = ${formatValueForExpression(clause.value)}`;
}

export function buildRelatedFilterExpression(
	source: InfraMonitoringEntity,
	target: InfraMonitoringEntity,
	attributes: EntityAttributes,
): string {
	return buildRelatedFilterClauses(source, target, attributes)
		.map(formatRelatedFilterClause)
		.join(' AND ');
}

export function resolveRelatedCategory(
	source: InfraMonitoringEntity,
	attributes: EntityAttributes,
	requested: string | null,
): InfraMonitoringEntity | null {
	const related = getRelatedCategories(source, attributes);
	const match = related.find((target) => target === requested);

	return match ?? related[0] ?? null;
}

export function carryOverListFilters(
	expression: string,
	target: InfraMonitoringEntity,
): string {
	if (!expression.trim()) {
		return '';
	}

	const supported = new Set(FILTERABLE_KEYS[target]);

	return extractQueryPairs(expression)
		.filter((pair) => supported.has(pair.key))
		.map((pair) => {
			const start = pair.position.negationStart ?? pair.position.keyStart;
			const lastValue = pair.valuesPosition?.[pair.valuesPosition.length - 1];
			const end =
				lastValue?.end ?? pair.position.valueEnd ?? pair.position.operatorEnd;

			return expression.slice(start, end + 1).trim();
		})
		.filter(Boolean)
		.join(' AND ');
}
