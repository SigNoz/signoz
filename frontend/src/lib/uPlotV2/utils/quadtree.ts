export interface QuadtreeRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

const MAX_OBJECTS = 10;
const MAX_LEVELS = 4;

/**
 * Spatial index over axis-aligned rectangles, for answering "what is under the
 * cursor" on charts whose marks have no shared x order to binary-search. An item
 * straddling a quadrant boundary lives in every quadrant it touches, so `get` can
 * report it more than once.
 */
export class Quadtree<T extends QuadtreeRect = QuadtreeRect> {
	private items: T[] = [];
	private quadrants: Quadtree<T>[] | null = null;

	constructor(
		private readonly x: number,
		private readonly y: number,
		private readonly w: number,
		private readonly h: number,
		private readonly level = 0,
	) {}

	add(item: T): void {
		if (this.quadrants) {
			this.forEachQuadrant(item, (quadrant) => quadrant.add(item));
			return;
		}

		this.items.push(item);

		if (this.items.length > MAX_OBJECTS && this.level < MAX_LEVELS) {
			this.split();
			const items = this.items;
			this.items = [];
			for (const existing of items) {
				this.forEachQuadrant(existing, (quadrant) => quadrant.add(existing));
			}
		}
	}

	/** Visits every item whose quadrant overlaps the rectangle; callers refine the test. */
	get(
		x: number,
		y: number,
		w: number,
		h: number,
		visit: (item: T) => void,
	): void {
		for (const item of this.items) {
			visit(item);
		}
		if (this.quadrants) {
			this.forEachQuadrant({ x, y, w, h }, (quadrant) =>
				quadrant.get(x, y, w, h, visit),
			);
		}
	}

	clear(): void {
		this.items = [];
		this.quadrants = null;
	}

	private split(): void {
		const w = this.w / 2;
		const h = this.h / 2;
		const level = this.level + 1;
		// North-east, north-west, south-west, south-east.
		this.quadrants = [
			new Quadtree<T>(this.x + w, this.y, w, h, level),
			new Quadtree<T>(this.x, this.y, w, h, level),
			new Quadtree<T>(this.x, this.y + h, w, h, level),
			new Quadtree<T>(this.x + w, this.y + h, w, h, level),
		];
	}

	private forEachQuadrant(
		rect: QuadtreeRect,
		visit: (quadrant: Quadtree<T>) => void,
	): void {
		if (!this.quadrants) {
			return;
		}
		const midX = this.x + this.w / 2;
		const midY = this.y + this.h / 2;
		const startsNorth = rect.y < midY;
		const startsWest = rect.x < midX;
		const endsEast = rect.x + rect.w > midX;
		const endsSouth = rect.y + rect.h > midY;

		if (startsNorth && endsEast) {
			visit(this.quadrants[0]);
		}
		if (startsWest && startsNorth) {
			visit(this.quadrants[1]);
		}
		if (startsWest && endsSouth) {
			visit(this.quadrants[2]);
		}
		if (endsEast && endsSouth) {
			visit(this.quadrants[3]);
		}
	}
}
