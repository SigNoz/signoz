import { Quadtree, QuadtreeRect } from '../quadtree';

interface Item extends QuadtreeRect {
	id: number;
}

function collect(
	tree: Quadtree<Item>,
	x: number,
	y: number,
	w: number,
	h: number,
): Set<number> {
	const ids = new Set<number>();
	tree.get(x, y, w, h, (item) => ids.add(item.id));
	return ids;
}

describe('Quadtree', () => {
	it('returns items in the queried region and not those far from it', () => {
		const tree = new Quadtree<Item>(0, 0, 100, 100);
		tree.add({ id: 1, x: 10, y: 10, w: 5, h: 5 });
		tree.add({ id: 2, x: 80, y: 80, w: 5, h: 5 });

		// Below the split threshold every item is visited; callers refine the hit.
		expect(collect(tree, 9, 9, 8, 8)).toStrictEqual(new Set([1, 2]));
	});

	it('splits past the object limit and still finds every item', () => {
		const tree = new Quadtree<Item>(0, 0, 100, 100);
		const total = 50;
		for (let id = 0; id < total; id++) {
			tree.add({ id, x: (id % 10) * 10, y: Math.floor(id / 10) * 10, w: 4, h: 4 });
		}

		expect(collect(tree, 0, 0, 100, 100).size).toBe(total);
	});

	it('after a split, a query in one quadrant skips items confined to another', () => {
		const tree = new Quadtree<Item>(0, 0, 100, 100);
		for (let id = 0; id < 20; id++) {
			// All in the north-west quadrant.
			tree.add({ id, x: 1 + id, y: 1, w: 2, h: 2 });
		}
		tree.add({ id: 99, x: 90, y: 90, w: 2, h: 2 });

		const northWest = collect(tree, 0, 0, 10, 10);
		expect(northWest.has(99)).toBe(false);
		expect(collect(tree, 85, 85, 10, 10).has(99)).toBe(true);
	});

	it('reports an item straddling the midline from either side', () => {
		const tree = new Quadtree<Item>(0, 0, 100, 100);
		for (let id = 0; id < 20; id++) {
			tree.add({ id, x: 1, y: 1 + id, w: 2, h: 2 });
		}
		tree.add({ id: 99, x: 48, y: 48, w: 4, h: 4 });

		expect(collect(tree, 40, 40, 5, 5).has(99)).toBe(true);
		expect(collect(tree, 55, 55, 5, 5).has(99)).toBe(true);
	});

	it('clear empties the tree', () => {
		const tree = new Quadtree<Item>(0, 0, 100, 100);
		tree.add({ id: 1, x: 10, y: 10, w: 5, h: 5 });
		tree.clear();

		expect(collect(tree, 0, 0, 100, 100).size).toBe(0);
	});
});
