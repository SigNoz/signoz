/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unused-expressions */
export function pointWithin(
	px: number,
	py: number,
	rlft: number,
	rtop: number,
	rrgt: number,
	rbtm: number,
): boolean {
	return px >= rlft && px <= rrgt && py >= rtop && py <= rbtm;
}

export const MAX_OBJECTS = 10;
export const MAX_LEVELS = 4;

export class Quadtree {
	x: number;

	y: number;

	w: number;

	h: number;

	l: number;

	o: any[];

	q: Quadtree[];

	constructor(x: number, y: number, w: number, h: number, l = 0) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.l = l;
		this.o = [];
		this.q = [];
	}

	split(): void {
		const { x } = this;
		const { y } = this;
		const w = this.w / 2;
		const h = this.h / 2;
		const l = this.l + 1;

		this.q = [
			new Quadtree(x + w, y, w, h, l), // top right
			new Quadtree(x, y, w, h, l), // top left
			new Quadtree(x, y + h, w, h, l), // bottom left
			new Quadtree(x + w, y + h, w, h, l), // bottom right
		];
	}

	quads(
		x: number,
		y: number,
		w: number,
		h: number,
		cb: (quad: Quadtree) => void,
	): void {
		const { q } = this;
		const hzMid = this.x + this.w / 2;
		const vtMid = this.y + this.h / 2;
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
	}

	add(o: any): void {
		if (this.q != null) {
			this.quads(o.x, o.y, o.w, o.h, (q: Quadtree) => {
				q.add(o);
			});
		} else {
			const os = this.o;
			os.push(o);

			if (os.length > MAX_OBJECTS && this.l < MAX_LEVELS) {
				this.split();

				for (const oi of os) {
					this.quads(oi.x, oi.y, oi.w, oi.h, (q: Quadtree) => {
						q.add(oi);
					});
				}

				this.o.length = 0;
			}
		}
	}

	get(x: number, y: number, w: number, h: number, cb: (o: any) => void): void {
		const os = this.o;
		for (const oi of os) {
			cb(oi);
		}

		if (this.q != null) {
			this.quads(x, y, w, h, (q: Quadtree) => {
				this.get(x, y, w, h, cb);
			});
		}
	}

	clear(): void {
		this.o.length = 0;
		this.q = [];
	}
}
