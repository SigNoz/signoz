import { onUpdateVariableNode } from '../util';
import { onUpdateVariableNodeMock } from './mock';

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
});
