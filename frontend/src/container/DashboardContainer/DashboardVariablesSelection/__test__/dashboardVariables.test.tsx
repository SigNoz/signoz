import {
	buildDependencies,
	buildDependencyGraph,
	buildParentDependencyGraph,
	onUpdateVariableNode,
	VariableGraph,
} from '../util';
import {
	buildDependenciesMock,
	buildGraphMock,
	onUpdateVariableNodeMock,
} from './mock';

describe('dashboardVariables - utilities and processors', () => {
	describe('onUpdateVariableNode', () => {
		const { graph, topologicalOrder } = onUpdateVariableNodeMock;
		const testCases = [
			{
				scenario: 'root element',
				nodeToUpdate: 'deployment_environment',
				expected: [
					'deployment_environment',
					'service_name',
					'endpoint',
					'http_status_code',
				],
			},
			{
				scenario: 'middle child',
				nodeToUpdate: 'k8s_node_name',
				expected: ['k8s_node_name', 'k8s_namespace_name'],
			},
			{
				scenario: 'leaf element',
				nodeToUpdate: 'http_status_code',
				expected: ['http_status_code'],
			},
			{
				scenario: 'node not in graph',
				nodeToUpdate: 'unknown',
				expected: [],
			},
			{
				scenario: 'node not in topological order',
				nodeToUpdate: 'unknown',
				expected: [],
			},
		];

		test.each(testCases)(
			'should update variable node when $scenario',
			({ nodeToUpdate, expected }) => {
				const updatedVariables: string[] = [];
				const callback = (node: string): void => {
					updatedVariables.push(node);
				};

				onUpdateVariableNode(nodeToUpdate, graph, topologicalOrder, callback);

				expect(updatedVariables).toEqual(expected);
			},
		);

		it('should return empty array when topological order is empty', () => {
			const updatedVariables: string[] = [];
			onUpdateVariableNode('http_status_code', graph, [], (node) =>
				updatedVariables.push(node),
			);
			expect(updatedVariables).toEqual([]);
		});
	});

	describe('Graph Building Utilities', () => {
		const { graph } = buildGraphMock;
		const { variables } = buildDependenciesMock;

		describe('buildParentDependencyGraph', () => {
			it('should build parent dependency graph with correct relationships', () => {
				const expected = {
					deployment_environment: [],
					service_name: ['deployment_environment'],
					endpoint: ['deployment_environment', 'service_name'],
					http_status_code: ['endpoint'],
					k8s_cluster_name: [],
					k8s_node_name: ['k8s_cluster_name'],
					k8s_namespace_name: ['k8s_cluster_name', 'k8s_node_name'],
					environment: [],
				};

				expect(buildParentDependencyGraph(graph)).toEqual(expected);
			});

			it('should handle empty graph', () => {
				expect(buildParentDependencyGraph({})).toEqual({});
			});
		});

		describe('buildDependencyGraph', () => {
			it('should build complete dependency graph with correct structure and order', () => {
				const expected = {
					order: [
						'deployment_environment',
						'k8s_cluster_name',
						'environment',
						'service_name',
						'k8s_node_name',
						'endpoint',
						'k8s_namespace_name',
						'http_status_code',
					],
					graph: {
						deployment_environment: ['service_name', 'endpoint'],
						service_name: ['endpoint'],
						endpoint: ['http_status_code'],
						http_status_code: [],
						k8s_cluster_name: ['k8s_node_name', 'k8s_namespace_name'],
						k8s_node_name: ['k8s_namespace_name'],
						k8s_namespace_name: [],
						environment: [],
					},
					parentDependencyGraph: {
						deployment_environment: [],
						service_name: ['deployment_environment'],
						endpoint: ['deployment_environment', 'service_name'],
						http_status_code: ['endpoint'],
						k8s_cluster_name: [],
						k8s_node_name: ['k8s_cluster_name'],
						k8s_namespace_name: ['k8s_cluster_name', 'k8s_node_name'],
						environment: [],
					},
					hasCycle: false,
					cycleNodes: undefined,
					transitiveDescendants: {
						deployment_environment: ['service_name', 'endpoint', 'http_status_code'],
						endpoint: ['http_status_code'],
						environment: [],
						http_status_code: [],
						k8s_cluster_name: ['k8s_node_name', 'k8s_namespace_name'],
						k8s_namespace_name: [],
						k8s_node_name: ['k8s_namespace_name'],
						service_name: ['endpoint', 'http_status_code'],
					},
				};

				expect(buildDependencyGraph(graph)).toEqual(expected);
			});

			it('should return empty transitiveDescendants for an empty graph', () => {
				const result = buildDependencyGraph({});
				expect(result.transitiveDescendants).toEqual({});
				expect(result.order).toEqual([]);
				expect(result.hasCycle).toBe(false);
			});

			it('should compute transitiveDescendants for a linear chain (a -> b -> c)', () => {
				const linearGraph: VariableGraph = {
					a: ['b'],
					b: ['c'],
					c: [],
				};
				const result = buildDependencyGraph(linearGraph);
				expect(result.transitiveDescendants).toEqual({
					a: ['b', 'c'],
					b: ['c'],
					c: [],
				});
			});

			it('should compute transitiveDescendants for a diamond dependency (a -> b, a -> c, b -> d, c -> d)', () => {
				const diamondGraph: VariableGraph = {
					a: ['b', 'c'],
					b: ['d'],
					c: ['d'],
					d: [],
				};
				const result = buildDependencyGraph(diamondGraph);
				expect(result.transitiveDescendants.a).toEqual(
					expect.arrayContaining(['b', 'c', 'd']),
				);
				expect(result.transitiveDescendants.a).toHaveLength(3);
				expect(result.transitiveDescendants.b).toEqual(['d']);
				expect(result.transitiveDescendants.c).toEqual(['d']);
				expect(result.transitiveDescendants.d).toEqual([]);
			});

			it('should handle disconnected components in transitiveDescendants', () => {
				const disconnectedGraph: VariableGraph = {
					a: ['b'],
					b: [],
					x: ['y'],
					y: [],
				};
				const result = buildDependencyGraph(disconnectedGraph);
				expect(result.transitiveDescendants.a).toEqual(['b']);
				expect(result.transitiveDescendants.b).toEqual([]);
				expect(result.transitiveDescendants.x).toEqual(['y']);
				expect(result.transitiveDescendants.y).toEqual([]);
			});

			it('should return empty transitiveDescendants for all leaf nodes', () => {
				const leafOnlyGraph: VariableGraph = {
					a: [],
					b: [],
					c: [],
				};
				const result = buildDependencyGraph(leafOnlyGraph);
				expect(result.transitiveDescendants).toEqual({
					a: [],
					b: [],
					c: [],
				});
			});
		});

		describe('buildDependencies', () => {
			it('should build dependency map from variables array', () => {
				const expected: VariableGraph = {
					deployment_environment: ['service_name', 'endpoint'],
					service_name: ['endpoint'],
					endpoint: ['http_status_code'],
					http_status_code: [],
					k8s_cluster_name: ['k8s_node_name', 'k8s_namespace_name'],
					k8s_node_name: ['k8s_namespace_name'],
					k8s_namespace_name: [],
					environment: [],
				};

				expect(buildDependencies(variables)).toEqual(expected);
			});

			it('should handle empty variables array', () => {
				expect(buildDependencies([])).toEqual({});
			});
		});
	});
});
