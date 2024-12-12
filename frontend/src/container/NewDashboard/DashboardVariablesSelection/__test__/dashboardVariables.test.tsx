import { checkAPIInvocation, onUpdateVariableNode } from '../util';
import { checkAPIInvocationMock, onUpdateVariableNodeMock } from './mock';

describe('dashboardVariables - utilities and processors', () => {
	const { graph, topologicalOrder } = onUpdateVariableNodeMock;

	test.each([
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
	])(
		'should update variable node when $scenario',
		({ nodeToUpdate, expected }) => {
			const updatedVariables: string[] = [];

			onUpdateVariableNode(nodeToUpdate, graph, topologicalOrder, (node) =>
				updatedVariables.push(node),
			);

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

	it('should give true for valid case - checkAPIInvocationMock', () => {
		const {
			variablesToGetUpdated,
			variableData,
			parentDependencyGraph,
		} = checkAPIInvocationMock;
		const result = checkAPIInvocation(
			variablesToGetUpdated,
			variableData,
			parentDependencyGraph,
		);

		// case 1: when variableData is empty
		expect(result).toBeFalsy();

		// case 2: when parentDependencyGraph is empty
		const result2 = checkAPIInvocation(variablesToGetUpdated, variableData, {});
		expect(result2).toBeTruthy();

		// case 3: when variableData is not empty and parentDependencyGraph is not empty
		const result3 = checkAPIInvocation(
			['k8s_node_name', 'k8s_namespace_name'],
			variableData,
			parentDependencyGraph,
		);
		expect(result3).toBeTruthy();

		// case 4: when variableData is not empty and parentDependencyGraph is not empty and variableData is not the first element in the variablesToGetUpdated array
		const result4 = checkAPIInvocation(
			['k8s_cluster_name', 'k8s_node_name', 'k8s_namespace_name'],
			variableData,
			parentDependencyGraph,
		);
		expect(result4).toBeFalsy();

		// case 5: root element
		const rootElement = {
			name: 'deployment_environment',
			key: '036a47cd-9ffc-47de-9f27-0329198964a8',
			allSelected: false,
			customValue: '',
			description: '',
			id: '036a47cd-9ffc-47de-9f27-0329198964a8',
			modificationUUID: '5f71b591-f583-497c-839d-6a1590c3f60f',
			multiSelect: false,
			order: 0,
			queryValue:
				"SELECT DISTINCT JSONExtractString(labels, 'deployment_environment') AS deployment_environment\nFROM signoz_metrics.distributed_time_series_v4_1day\nWHERE metric_name = 'signoz_calls_total'",
			selectedValue: 'production',
			showALLOption: false,
			sort: 'DISABLED',
			textboxValue: '',
			type: 'QUERY',
		} as any;

		const result5 = checkAPIInvocation(
			['deployment_environment', 'service_name', 'endpoint', 'http_status_code'],
			rootElement,
			parentDependencyGraph,
		);
		expect(result5).toBeTruthy();

		// case 6: root element check should work fine with empty variablesToGetUpdated array
		const result6 = checkAPIInvocation([], rootElement, parentDependencyGraph);
		expect(result6).toBeTruthy();
	});
});
