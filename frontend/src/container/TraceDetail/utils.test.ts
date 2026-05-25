import { ITraceTree } from 'types/api/trace/getTraceItem';

import { getTreeLevelsCount } from './utils';

describe('traces/getTreeLevelsCount', () => {
	const createNode = (id: string, children: ITraceTree[] = []): ITraceTree => ({
		id,
		name: '',
		value: 0,
		time: 0,
		startTime: 0,
		tags: [],
		children,
		serviceName: '',
		serviceColour: '',
		spanKind: '',
		statusCodeString: '',
		statusMessage: '',
	});

	it('should return 0 for empty tree', () => {
		const emptyTree = null;
		expect(getTreeLevelsCount(emptyTree as unknown as ITraceTree)).toBe(0);
	});

	it('should return 1 for a tree with a single node', () => {
		const singleNodeTree = createNode('1');
		expect(getTreeLevelsCount(singleNodeTree)).toBe(1);
	});

	it('should return correct depth for a balanced tree', () => {
		const tree = createNode('1', [
			createNode('2', [createNode('4'), createNode('5')]),
			createNode('3', [createNode('6'), createNode('7')]),
		]);

		expect(getTreeLevelsCount(tree)).toBe(3);
	});

	it('should return correct depth for an unbalanced tree', () => {
		const tree = createNode('1', [
			createNode('2', [
				createNode('4', [createNode('8', [createNode('11')])]),
				createNode('5'),
			]),
			createNode('3', [createNode('6'), createNode('7', [createNode('10')])]),
		]);

		expect(getTreeLevelsCount(tree)).toBe(5);
	});

	it('should return correct depth for a tree with single child nodes', () => {
		const tree = createNode('1', [
			createNode('2', [createNode('3', [createNode('4', [createNode('5')])])]),
		]);

		expect(getTreeLevelsCount(tree)).toBe(5);
	});
});
