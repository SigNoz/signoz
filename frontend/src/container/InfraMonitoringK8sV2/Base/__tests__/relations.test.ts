import { InfraMonitoringEntity } from '../../constants';
import {
	buildRelatedFilterExpression,
	carryOverListFilters,
	getRelatedCategories,
} from '../relations';

/** What /api/v2/infra_monitoring/pods returns as a pod's meta. */
const POD_ATTRIBUTES = {
	'k8s.pod.uid': '63edbad0-398e-48e5-baba-f7ded7c73f1b',
	'k8s.pod.name': 'checkout-7d9f',
	'k8s.namespace.name': 'shop',
	'k8s.cluster.name': 'prod',
	'k8s.node.name': 'node-1',
	'k8s.deployment.name': 'checkout',
};

const NODE_ATTRIBUTES = {
	'k8s.node.name': 'node-1',
	'k8s.cluster.name': 'prod',
};

describe('getRelatedCategories', () => {
	it('offers every other kubernetes category, never itself', () => {
		expect(
			getRelatedCategories(InfraMonitoringEntity.PODS, POD_ATTRIBUTES),
		).toStrictEqual([
			InfraMonitoringEntity.CONTAINERS,
			InfraMonitoringEntity.DEPLOYMENTS,
			InfraMonitoringEntity.STATEFULSETS,
			InfraMonitoringEntity.DAEMONSETS,
			InfraMonitoringEntity.JOBS,
			InfraMonitoringEntity.VOLUMES,
			InfraMonitoringEntity.NODES,
			InfraMonitoringEntity.NAMESPACES,
			InfraMonitoringEntity.CLUSTERS,
		]);
	});

	it('scopes a category it has no relation to by what they share', () => {
		// Not this pod's statefulsets, which it has none of: the ones beside it
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.PODS,
				InfraMonitoringEntity.STATEFULSETS,
				POD_ATTRIBUTES,
			),
		).toBe("k8s.cluster.name = 'prod' AND k8s.namespace.name = 'shop'");
	});

	it('falls back to the cluster where that is all two categories share', () => {
		// Deployment metrics carry no node, so this relation is unexpressible
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.NODES,
				InfraMonitoringEntity.DEPLOYMENTS,
				NODE_ATTRIBUTES,
			),
		).toBe("k8s.cluster.name = 'prod'");
	});

	it('finds nothing for a host, which is not a kubernetes resource', () => {
		// Host rows carry os.type and the host name, no kubernetes attribute
		expect(
			getRelatedCategories(InfraMonitoringEntity.HOSTS, {
				'host.name': 'ip-10-0-0-1',
				'os.type': 'linux',
			}),
		).toStrictEqual([]);
	});

	it('lists pods first, which makes them the default for a node', () => {
		expect(
			getRelatedCategories(InfraMonitoringEntity.NODES, NODE_ATTRIBUTES)[0],
		).toBe(InfraMonitoringEntity.PODS);
	});
});

describe('buildRelatedFilterExpression', () => {
	it('scopes the pods of a node by the node, inside its cluster', () => {
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.NODES,
				InfraMonitoringEntity.PODS,
				NODE_ATTRIBUTES,
			),
		).toBe("k8s.cluster.name = 'prod' AND k8s.node.name = 'node-1'");
	});

	it("scopes a pod's containers by the pod uid, which those rows carry", () => {
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.PODS,
				InfraMonitoringEntity.CONTAINERS,
				POD_ATTRIBUTES,
			),
		).toBe(
			"k8s.cluster.name = 'prod' AND k8s.namespace.name = 'shop' AND k8s.pod.uid = '63edbad0-398e-48e5-baba-f7ded7c73f1b'",
		);
	});

	it("reaches a pod's deployment by name, the only key that endpoint has", () => {
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.PODS,
				InfraMonitoringEntity.DEPLOYMENTS,
				POD_ATTRIBUTES,
			),
		).toBe(
			"k8s.cluster.name = 'prod' AND k8s.namespace.name = 'shop' AND k8s.deployment.name = 'checkout'",
		);
	});

	it('names the parent when the drawer resource belongs to it', () => {
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.PODS,
				InfraMonitoringEntity.NODES,
				POD_ATTRIBUTES,
			),
		).toBe("k8s.cluster.name = 'prod' AND k8s.node.name = 'node-1'");
	});

	it('asks a cluster list for the cluster alone', () => {
		expect(
			buildRelatedFilterExpression(
				InfraMonitoringEntity.PODS,
				InfraMonitoringEntity.CLUSTERS,
				POD_ATTRIBUTES,
			),
		).toBe("k8s.cluster.name = 'prod'");
	});
});

describe('carryOverListFilters', () => {
	it('keeps the clauses the target endpoint understands', () => {
		expect(
			carryOverListFilters(
				"k8s.namespace.name = 'shop' AND k8s.node.condition_ready = true",
				InfraMonitoringEntity.PODS,
			),
		).toBe("k8s.namespace.name = 'shop'");
	});

	it('drops a filter written against the source entity only', () => {
		expect(
			carryOverListFilters('k8s.node.cpu.usage > 0.5', InfraMonitoringEntity.PODS),
		).toBe('');
	});

	it('returns nothing for an empty list filter', () => {
		expect(carryOverListFilters('   ', InfraMonitoringEntity.PODS)).toBe('');
	});
});
