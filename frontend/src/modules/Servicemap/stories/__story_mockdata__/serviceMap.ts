/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { getResourceDeploymentKeys } from 'hooks/useResourceAttribute/utils';
import type { ServicesMapItem } from 'store/actions/serviceMap';
import type {
	TagKeysPayloadProps,
	TagValuesPayloadProps,
} from 'types/api/metrics/getResourceAttributes';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { Tags } from 'types/reducer/trace';

export const SERVICE_HEALTH = ['healthy', 'degraded', 'failing'] as const;

export type ServiceHealth = (typeof SERVICE_HEALTH)[number];

interface Dependency {
	parent: string;
	child: string;
	callCount: number;
	callRate: number;
	/** Nanoseconds: the link tooltip divides by 1e6 to show milliseconds. */
	p99: number;
	environment: string;
	cluster: string;
}

/**
 * One call edge per entry, parents before children, so slicing the head of the
 * list keeps the graph connected instead of leaving orphaned nodes behind.
 */
const DEPENDENCIES: Dependency[] = [
	{
		parent: 'gateway',
		child: 'frontend',
		callCount: 41200,
		callRate: 68.4,
		p99: 184_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'frontend',
		child: 'auth',
		callCount: 12800,
		callRate: 21.3,
		p99: 46_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'frontend',
		child: 'catalogue',
		callCount: 18600,
		callRate: 31,
		p99: 92_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'frontend',
		child: 'cart',
		callCount: 9400,
		callRate: 15.6,
		p99: 58_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'cart',
		child: 'redis',
		callCount: 7300,
		callRate: 12.1,
		p99: 4_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'catalogue',
		child: 'mysql',
		callCount: 15200,
		callRate: 25.3,
		p99: 31_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'auth',
		child: 'mysql',
		callCount: 8100,
		callRate: 13.5,
		p99: 27_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'frontend',
		child: 'checkout',
		callCount: 6200,
		callRate: 10.3,
		p99: 210_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'checkout',
		child: 'payments',
		callCount: 5900,
		callRate: 9.8,
		p99: 340_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'checkout',
		child: 'shipping',
		callCount: 5400,
		callRate: 9,
		p99: 120_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'payments',
		child: 'stripe-proxy',
		callCount: 5100,
		callRate: 8.5,
		p99: 290_000_000,
		environment: 'production',
		cluster: 'prod-us-east',
	},
	{
		parent: 'shipping',
		child: 'geo-service',
		callCount: 4700,
		callRate: 7.8,
		p99: 76_000_000,
		environment: 'production',
		cluster: 'prod-eu-west',
	},
	{
		parent: 'geo-service',
		child: 'redis',
		callCount: 4300,
		callRate: 7.1,
		p99: 3_000_000,
		environment: 'production',
		cluster: 'prod-eu-west',
	},
	{
		parent: 'catalogue',
		child: 'recommendations',
		callCount: 3800,
		callRate: 6.3,
		p99: 150_000_000,
		environment: 'staging',
		cluster: 'staging-eu',
	},
	{
		parent: 'recommendations',
		child: 'ml-inference',
		callCount: 3500,
		callRate: 5.8,
		p99: 480_000_000,
		environment: 'staging',
		cluster: 'staging-eu',
	},
	{
		parent: 'notifications',
		child: 'email-relay',
		callCount: 900,
		callRate: 1.5,
		p99: 65_000_000,
		environment: 'staging',
		cluster: 'staging-eu',
	},
];

export const MAX_DEPENDENCIES = DEPENDENCIES.length;

const DEGRADED_SERVICES = ['payments', 'redis'];

const ERROR_RATES = [1.2, 3.4, 0.8, 6.1, 2.5];

const errorRateFor = (
	child: string,
	health: ServiceHealth,
	index: number,
): number => {
	if (health === 'healthy') {
		return 0;
	}

	if (health === 'degraded' && !DEGRADED_SERVICES.includes(child)) {
		return 0;
	}

	return ERROR_RATES[index % ERROR_RATES.length];
};

const ATTRIBUTE_BY_TAG_KEY: Record<string, 'environment' | 'cluster'> = {
	'deployment.environment': 'environment',
	'k8s.cluster.name': 'cluster',
};

/**
 * The page sends its resource-attribute chips as trace tags, so the response has
 * to narrow with them: a filter that changed nothing would look broken.
 */
const matchesTag = (dependency: Dependency, tag: Tags): boolean => {
	const attribute = ATTRIBUTE_BY_TAG_KEY[tag.Key];

	if (!attribute) {
		return true;
	}

	const matched = tag.StringValues.includes(dependency[attribute]);

	return tag.Operator === 'NotIn' ? !matched : matched;
};

interface DependencyGraphOptions {
	count: number;
	health: ServiceHealth;
	tags?: Tags[];
}

export const dependencyGraphResponse = ({
	count,
	health,
	tags = [],
}: DependencyGraphOptions): ServicesMapItem[] =>
	DEPENDENCIES.slice(0, count)
		.filter((dependency) => tags.every((tag) => matchesTag(dependency, tag)))
		.map(({ parent, child, callCount, callRate, p99 }, index) => ({
			parent,
			child,
			callCount,
			callRate,
			p99,
			errorRate: errorRateFor(child, health, index),
		}));

const ENVIRONMENT_KEY = 'resource_deployment_environment';
const CLUSTER_KEY = 'resource_k8s_cluster_name';
const NAMESPACE_KEY = 'resource_k8s_cluster_namespace';

/**
 * `service.name` and `host.name` are not in the service-map whitelist, so they
 * are here to be dropped: the page filters the keys it offers down to the three
 * it can send to `/dependency_graph`.
 */
const ATTRIBUTE_KEYS = [
	ENVIRONMENT_KEY,
	CLUSTER_KEY,
	NAMESPACE_KEY,
	'resource_service_name',
	'resource_host_name',
];

const ENVIRONMENTS = [
	'production',
	'staging',
	'development',
	'canary',
	'load-test',
];

const CLUSTERS = ['prod-us-east', 'prod-eu-west', 'staging-eu'];

const NAMESPACES = ['default', 'checkout', 'ingest'];

/**
 * The environment selector asks the same endpoint as the attribute filter, and
 * the deployment key it matches on is the only thing telling the two apart.
 */
export const attributeKeysFor = (searchText: string | null): string[] =>
	searchText === getResourceDeploymentKeys()
		? [getResourceDeploymentKeys()]
		: ATTRIBUTE_KEYS;

export const attributeValuesFor = (
	attributeKey: string | null,
	environments: number,
): string[] => {
	if (
		attributeKey === getResourceDeploymentKeys() ||
		attributeKey === ENVIRONMENT_KEY
	) {
		return ENVIRONMENTS.slice(0, environments);
	}

	if (attributeKey === CLUSTER_KEY) {
		return CLUSTERS;
	}

	return attributeKey === NAMESPACE_KEY ? NAMESPACES : [];
};

export const attributeKeysResponse = (
	keys: readonly string[],
): TagKeysPayloadProps & { status: string } => ({
	status: 'success',
	data: {
		attributeKeys: keys.map((key) => ({
			key,
			type: 'resource',
			dataType: DataTypes.String,
		})),
	},
});

export const attributeValuesResponse = (
	values: readonly string[],
): TagValuesPayloadProps & { status: string } => ({
	status: 'success',
	data: {
		boolAttributeValues: null,
		numberAttributeValues: null,
		stringAttributeValues: [...values],
	},
});

export const RESOURCE_FILTERS = ['environment', 'cluster'] as const;

export type ResourceFilter = (typeof RESOURCE_FILTERS)[number];

/**
 * The environment query has to carry the deployment key the app derives, since
 * that is what routes it into the environment selector instead of a chip.
 */
const FILTER_QUERIES: Record<ResourceFilter, IResourceAttribute> = {
	environment: {
		id: 'storybook-environment',
		tagKey: getResourceDeploymentKeys(),
		operator: 'IN',
		tagValue: ['production'],
	},
	cluster: {
		id: 'storybook-cluster',
		tagKey: CLUSTER_KEY,
		operator: 'IN',
		tagValue: ['prod-us-east'],
	},
};

export const resourceFilterQueries = (
	filters: readonly ResourceFilter[],
): IResourceAttribute[] => filters.map((filter) => FILTER_QUERIES[filter]);
