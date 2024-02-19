// /* eslint-disable @typescript-eslint/no-unused-expressions */
// /* eslint-disable @typescript-eslint/no-this-alias */
// const MAX_OBJECTS = 10;
// const MAX_LEVELS = 4;

// export type Quads = [Quadtree, Quadtree, Quadtree, Quadtree];
// export type Rect = {
// 	x: number;
// 	y: number;
// 	w: number;
// 	h: number;
// 	[_: string]: any;
// };

// /**
//  * @internal
//  */
// export function pointWithin(
// 	px: number,
// 	py: number,
// 	rlft: number,
// 	rtop: number,
// 	rrgt: number,
// 	rbtm: number,
// ): boolean {
// 	return px >= rlft && px <= rrgt && py >= rtop && py <= rbtm;
// }

// /**
//  * @internal
//  */
// export function findRect(
// 	qt: Quadtree,
// 	sidx: number,
// 	didx: number,
// ): Rect | undefined {
// 	let out: Rect | undefined;

// 	if (qt.o.length) {
// 		out = qt.o.find((rect) => rect.sidx === sidx && rect.didx === didx);
// 	}

// 	if (out == null && qt.q) {
// 		for (let i = 0; i < qt.q.length; i++) {
// 			out = findRect(qt.q[i], sidx, didx);

// 			if (out) {
// 				break;
// 			}
// 		}
// 	}

// 	return out;
// }

// /**
//  * @internal
//  *
//  * Determines if r2 is intersected by r1.
//  */
// export function intersects(r1: Rect, r2: Rect): boolean {
// 	return (
// 		r1.x <= r2.x + r2.w &&
// 		r1.x + r1.w >= r2.x &&
// 		r1.y + r1.h >= r2.y &&
// 		r1.y <= r2.y + r2.h
// 	);
// }

// /**
//  * @internal
//  */
// export class Quadtree {
// 	o: Rect[];

// 	q: Quads | null;

// 	constructor(
// 		public x: number,
// 		public y: number,
// 		public w: number,
// 		public h: number,
// 		public l = 0,
// 	) {
// 		this.o = [];
// 		this.q = null;
// 	}

// 	split(): void {
// 		const t = this;
// 		const { x } = t;
// 		const { y } = t;
// 		const w = t.w / 2;
// 		const h = t.h / 2;
// 		const l = t.l + 1;

// 		t.q = [
// 			// top right
// 			new Quadtree(x + w, y, w, h, l),
// 			// top left
// 			new Quadtree(x, y, w, h, l),
// 			// bottom left
// 			new Quadtree(x, y + h, w, h, l),
// 			// bottom right
// 			new Quadtree(x + w, y + h, w, h, l),
// 		];
// 	}

// 	// invokes callback with index of each overlapping quad
// 	quads(
// 		x: number,
// 		y: number,
// 		w: number,
// 		h: number,
// 		cb: (q: Quadtree) => void,
// 	): void {
// 		const t = this;
// 		const q = t.q!;
// 		const hzMid = t.x + t.w / 2;
// 		const vtMid = t.y + t.h / 2;
// 		const startIsNorth = y < vtMid;
// 		const startIsWest = x < hzMid;
// 		const endIsEast = x + w > hzMid;
// 		const endIsSouth = y + h > vtMid;

// 		// top-right quad
// 		startIsNorth && endIsEast && cb(q[0]);
// 		// top-left quad
// 		startIsWest && startIsNorth && cb(q[1]);
// 		// bottom-left quad
// 		startIsWest && endIsSouth && cb(q[2]);
// 		// bottom-right quad
// 		endIsEast && endIsSouth && cb(q[3]);
// 	}

// 	add(o: Rect): void {
// 		const t = this;

// 		if (t.q != null) {
// 			t.quads(o.x, o.y, o.w, o.h, (q) => {
// 				q.add(o);
// 			});
// 		} else {
// 			const os = t.o;

// 			os.push(o);

// 			if (os.length > MAX_OBJECTS && t.l < MAX_LEVELS) {
// 				t.split();

// 				for (let i = 0; i < os.length; i++) {
// 					const oi = os[i];

// 					t.quads(oi.x, oi.y, oi.w, oi.h, (q) => {
// 						q.add(oi);
// 					});
// 				}

// 				t.o.length = 0;
// 			}
// 		}
// 	}

// 	get(x: number, y: number, w: number, h: number, cb: (o: Rect) => void): void {
// 		const t = this;
// 		const os = t.o;

// 		for (let i = 0; i < os.length; i++) {
// 			cb(os[i]);
// 		}

// 		if (t.q != null) {
// 			t.quads(x, y, w, h, (q) => {
// 				q.get(x, y, w, h, cb);
// 			});
// 		}
// 	}

// 	clear(): void {
// 		this.o.length = 0;
// 		this.q = null;
// 	}
// }

export function pointWithin(px, py, rlft, rtop, rrgt, rbtm) {
	return px >= rlft && px <= rrgt && py >= rtop && py <= rbtm;
}

const MAX_OBJECTS = 10;
const MAX_LEVELS = 4;

export function Quadtree(x, y, w, h, l) {
	const t = this;

	t.x = x;
	t.y = y;
	t.w = w;
	t.h = h;
	t.l = l || 0;
	t.o = [];
	t.q = null;
}

const proto = {
	split() {
		const t = this;
		const { x } = t;
		const { y } = t;
		const w = t.w / 2;
		const h = t.h / 2;
		const l = t.l + 1;

		t.q = [
			// top right
			new Quadtree(x + w, y, w, h, l),
			// top left
			new Quadtree(x, y, w, h, l),
			// bottom left
			new Quadtree(x, y + h, w, h, l),
			// bottom right
			new Quadtree(x + w, y + h, w, h, l),
		];
	},

	// invokes callback with index of each overlapping quad
	quads(x, y, w, h, cb) {
		const t = this;
		const { q } = t;
		const hzMid = t.x + t.w / 2;
		const vtMid = t.y + t.h / 2;
		const startIsNorth = y < vtMid;
		const startIsWest = x < hzMid;
		const endIsEast = x + w > hzMid;
		const endIsSouth = y + h > vtMid;

		// top-right quad
		startIsNorth && endIsEast && cb(q[0]);
		// top-left quad
		startIsWest && startIsNorth && cb(q[1]);
		// bottom-left quad
		startIsWest && endIsSouth && cb(q[2]);
		// bottom-right quad
		endIsEast && endIsSouth && cb(q[3]);
	},

	add(o) {
		const t = this;

		if (t.q != null) {
			t.quads(o.x, o.y, o.w, o.h, (q) => {
				q.add(o);
			});
		} else {
			const os = t.o;

			os.push(o);

			if (os.length > MAX_OBJECTS && t.l < MAX_LEVELS) {
				t.split();

				for (let i = 0; i < os.length; i++) {
					const oi = os[i];

					t.quads(oi.x, oi.y, oi.w, oi.h, (q) => {
						q.add(oi);
					});
				}

				t.o.length = 0;
			}
		}
	},

	get(x, y, w, h, cb) {
		const t = this;
		const os = t.o;

		for (let i = 0; i < os.length; i++) cb(os[i]);

		if (t.q != null) {
			t.quads(x, y, w, h, (q) => {
				q.get(x, y, w, h, cb);
			});
		}
	},

	clear() {
		this.o.length = 0;
		this.q = null;
	},
};

Object.assign(Quadtree.prototype, proto);

global.Quadtree = Quadtree;
