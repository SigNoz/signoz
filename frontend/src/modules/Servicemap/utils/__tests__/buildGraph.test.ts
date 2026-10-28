import type { ServiceMapDependency } from '../../types';
import { buildGraph, getNodePositions } from '../buildGraph';

const dependency = (
	parent: string,
	child: string,
	callCount: number,
	errorRate: number,
): ServiceMapDependency => ({
	parent,
	child,
	callCount,
	callRate: callCount / 60,
	errorRate,
	p99: 1_000_000,
});

describe('buildGraph', () => {
	it('weights a node error rate by the calls on each incoming edge', () => {
		const { nodes } = buildGraph([
			dependency('a', 'target', 100, 10),
			dependency('b', 'target', 900, 0),
		]);

		expect(nodes.find((node) => node.id === 'target')?.errorRate).toBeCloseTo(1);
	});

	it('never reports more than 100% errors for a node', () => {
		const { nodes } = buildGraph([
			dependency('a', 'target', 10, 40),
			dependency('b', 'target', 10, 40),
			dependency('c', 'target', 10, 40),
		]);

		expect(nodes.find((node) => node.id === 'target')?.errorRate).toBeCloseTo(40);
	});

	it('sums incoming calls and leaves root services without calls', () => {
		const { nodes } = buildGraph([
			dependency('root', 'a', 120, 0),
			dependency('a', 'b', 60, 0),
			dependency('root', 'b', 60, 0),
		]);

		expect(nodes.find((node) => node.id === 'root')).toMatchObject({
			callCount: 0,
			callRate: 0,
			errorRate: 0,
		});
		expect(nodes.find((node) => node.id === 'b')).toMatchObject({
			callCount: 120,
			callRate: 2,
		});
	});

	it('returns nodes and links in the same order whatever the input order', () => {
		const dependencies = [
			dependency('b', 'c', 1, 0),
			dependency('a', 'b', 1, 0),
			dependency('a', 'c', 1, 0),
		];

		const first = buildGraph(dependencies);
		const second = buildGraph([...dependencies].reverse());

		expect(first.nodes.map((node) => node.id)).toStrictEqual(['a', 'b', 'c']);
		expect(second).toStrictEqual(first);
		expect(first.links.map((link) => `${link.source}>${link.target}`)).toStrictEqual(
			['a>b', 'a>c', 'b>c'],
		);
	});

	it('keeps the positions of nodes that were already laid out', () => {
		const previous = buildGraph([dependency('a', 'b', 1, 0)]);
		previous.nodes[0].x = 10;
		previous.nodes[0].y = 20;

		const { nodes } = buildGraph(
			[dependency('a', 'b', 1, 0), dependency('a', 'c', 1, 0)],
			getNodePositions(previous.nodes),
		);

		expect(nodes.find((node) => node.id === 'a')).toMatchObject({ x: 10, y: 20 });
		expect(nodes.find((node) => node.id === 'c')?.x).toBeUndefined();
	});

	it('returns an empty graph for no dependencies', () => {
		expect(buildGraph([])).toStrictEqual({ nodes: [], links: [] });
	});
});
