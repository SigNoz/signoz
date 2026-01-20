import { areArraysEqual, onUpdateVariableNode, VariableGraph } from './util';

describe('areArraysEqual', () => {
	it('should return true for equal arrays with same order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'hello'];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});

	it('should return false for equal arrays with different order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = ['hello', 1, true, 'a', 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different lengths', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different elements', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'world'];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return true for empty arrays', () => {
		const array1: string[] = [];
		const array2: string[] = [];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});
});

describe('onUpdateVariableNode', () => {
	// Graph structure:
	// deployment -> namespace -> service -> pod
	// deployment has no parents, namespace depends on deployment, etc.
	const graph: VariableGraph = {
		deployment: ['namespace'],
		namespace: ['service'],
		service: ['pod'],
		pod: [],
		customVar: ['namespace'], // CUSTOM variable that affects namespace
	};

	const topologicalOrder = ['deployment', 'namespace', 'service', 'pod'];

	it('should call callback for the node and all its descendants', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', graph, topologicalOrder, callback);

		expect(visited).toEqual(['deployment', 'namespace', 'service', 'pod']);
	});

	it('should call callback starting from a middle node', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('namespace', graph, topologicalOrder, callback);

		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});

	it('should only call callback for the leaf node when updating leaf', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('pod', graph, topologicalOrder, callback);

		expect(visited).toEqual(['pod']);
	});

	it('should handle CUSTOM variable not in topologicalOrder by updating its children', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		// customVar is not in topologicalOrder but has namespace as a child
		onUpdateVariableNode('customVar', graph, topologicalOrder, callback);

		// Should process namespace and its descendants (service, pod)
		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});

	it('should handle node not in graph gracefully', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('unknownNode', graph, topologicalOrder, callback);

		// Should not call callback for any node since unknownNode has no children
		expect(visited).toEqual([]);
	});

	it('should handle empty graph', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', {}, topologicalOrder, callback);

		// deployment is in topologicalOrder, so callback is called for it
		expect(visited).toEqual(['deployment']);
	});

	it('should handle empty topologicalOrder', () => {
		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode('deployment', graph, [], callback);

		expect(visited).toEqual([]);
	});

	it('should handle CUSTOM variable with multiple children', () => {
		const graphWithMultipleChildren: VariableGraph = {
			...graph,
			customMulti: ['namespace', 'service'], // CUSTOM variable affecting multiple nodes
		};

		const visited: string[] = [];
		const callback = (node: string): void => {
			visited.push(node);
		};

		onUpdateVariableNode(
			'customMulti',
			graphWithMultipleChildren,
			topologicalOrder,
			callback,
		);

		// Should process namespace, service, and pod (descendants)
		expect(visited).toEqual(['namespace', 'service', 'pod']);
	});
});
