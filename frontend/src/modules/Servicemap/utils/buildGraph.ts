import type {
	ServiceMapDependency,
	ServiceMapGraph,
	ServiceMapLink,
	ServiceMapNode,
} from '../types';

type Position = Pick<ServiceMapNode, 'x' | 'y' | 'vx' | 'vy'>;

const compareIds = (a: string, b: string): number =>
	a < b ? -1 : Number(a > b);

/**
 * Nodes and links are sorted by id: d3-force places nodes without a position by
 * their index, so the same data always draws the same layout.
 */
export const buildGraph = (
	dependencies: ServiceMapDependency[],
	previousPositions: ReadonlyMap<string, Position> = new Map(),
): ServiceMapGraph => {
	const incoming = new Map<
		string,
		{ callCount: number; errorCount: number; callRate: number }
	>();
	const ids = new Set<string>();

	dependencies.forEach(({ parent, child, callCount, callRate, errorRate }) => {
		ids.add(parent);
		ids.add(child);

		const totals = incoming.get(child) ?? {
			callCount: 0,
			errorCount: 0,
			callRate: 0,
		};
		totals.callCount += callCount;
		totals.errorCount += (errorRate / 100) * callCount;
		totals.callRate += callRate;
		incoming.set(child, totals);
	});

	const nodes: ServiceMapNode[] = [...ids].sort(compareIds).map((id) => {
		const totals = incoming.get(id);
		const callCount = totals?.callCount ?? 0;

		return {
			id,
			callCount,
			callRate: totals?.callRate ?? 0,
			errorRate: callCount > 0 ? ((totals?.errorCount ?? 0) / callCount) * 100 : 0,
			...previousPositions.get(id),
		};
	});

	const links: ServiceMapLink[] = dependencies
		.map(({ parent, child, callCount, callRate, errorRate, p99 }) => ({
			source: parent,
			target: child,
			callCount,
			callRate,
			errorRate,
			p99,
		}))
		.sort(
			(a, b) => compareIds(a.source, b.source) || compareIds(a.target, b.target),
		);

	return { nodes, links };
};

export const getNodePositions = (
	nodes: readonly ServiceMapNode[],
): Map<string, Position> =>
	new Map(
		nodes
			.filter((node) => node.x !== undefined && node.y !== undefined)
			.map(({ id, x, y, vx, vy }) => [id, { x, y, vx, vy }]),
	);
