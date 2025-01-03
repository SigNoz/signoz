import {
	buildDependencies,
	buildDependencyGraph,
	buildParentDependencyGraph,
	checkAPIInvocation,
	onUpdateVariableNode,
	VariableGraph,
} from '../util';
import {
	buildDependenciesMock,
	buildGraphMock,
	checkAPIInvocationMock,
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

	describe('checkAPIInvocation', () => {
		const {
			variablesToGetUpdated,
			variableData,
			parentDependencyGraph,
		} = checkAPIInvocationMock;

		const mockRootElement = {
			name: 'deployment_environment',
			key: '036a47cd-9ffc-47de-9f27-0329198964a8',
			id: '036a47cd-9ffc-47de-9f27-0329198964a8',
			modificationUUID: '5f71b591-f583-497c-839d-6a1590c3f60f',
			selectedValue: 'production',
			type: 'QUERY',
			// ... other properties omitted for brevity
		} as any;

		describe('edge cases', () => {
			it('should return false when variableData is empty', () => {
				expect(
					checkAPIInvocation(
						variablesToGetUpdated,
						variableData,
						parentDependencyGraph,
					),
				).toBeFalsy();
			});

			it('should return true when parentDependencyGraph is empty', () => {
				expect(
					checkAPIInvocation(variablesToGetUpdated, variableData, {}),
				).toBeFalsy();
			});
		});

		describe('variable sequences', () => {
			it('should return true for valid sequence', () => {
				expect(
					checkAPIInvocation(
						['k8s_node_name', 'k8s_namespace_name'],
						variableData,
						parentDependencyGraph,
					),
				).toBeTruthy();
			});

			it('should return false for invalid sequence', () => {
				expect(
					checkAPIInvocation(
						['k8s_cluster_name', 'k8s_node_name', 'k8s_namespace_name'],
						variableData,
						parentDependencyGraph,
					),
				).toBeFalsy();
			});

			it('should return false when variableData is not in sequence', () => {
				expect(
					checkAPIInvocation(
						['deployment_environment', 'service_name', 'endpoint'],
						variableData,
						parentDependencyGraph,
					),
				).toBeFalsy();
			});
		});

		describe('root element behavior', () => {
			it('should return true for valid root element sequence', () => {
				expect(
					checkAPIInvocation(
						[
							'deployment_environment',
							'service_name',
							'endpoint',
							'http_status_code',
						],
						mockRootElement,
						parentDependencyGraph,
					),
				).toBeTruthy();
			});

			it('should return true for empty variablesToGetUpdated array', () => {
				expect(
					checkAPIInvocation([], mockRootElement, parentDependencyGraph),
				).toBeTruthy();
			});
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
				};

				expect(buildDependencyGraph(graph)).toEqual(expected);
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
