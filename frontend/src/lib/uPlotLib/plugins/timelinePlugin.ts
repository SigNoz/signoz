/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-param-reassign */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-return-assign */
/* eslint-disable no-nested-ternary */
import uPlot, { RectH } from 'uplot';

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
const MAX_OBJECTS = 10;
const MAX_LEVELS = 4;

export class Quadtree {
	x: number;

	y: number;

	w: number;

	h: number;

	l: number;

	o: any[];

	q: Quadtree[] | null;

	constructor(x: number, y: number, w: number, h: number, l?: number) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.l = l || 0;
		this.o = [];
		this.q = null;
	}

	split(): void {
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
	}

	quads(
		x: number,
		y: number,
		w: number,
		h: number,
		cb: (quad: Quadtree) => void,
	): void {
		const t = this;
		const { q } = t;
		const hzMid = t.x + t.w / 2;
		const vtMid = t.y + t.h / 2;
		const startIsNorth = y < vtMid;
		const startIsWest = x < hzMid;
		const endIsEast = x + w > hzMid;
		const endIsSouth = y + h > vtMid;
		if (q) {
			// top-right quad
			startIsNorth && endIsEast && cb(q[0]);
			// top-left quad
			startIsWest && startIsNorth && cb(q[1]);
			// bottom-left quad
			startIsWest && endIsSouth && cb(q[2]);
			// bottom-right quad
			endIsEast && endIsSouth && cb(q[3]);
		}
	}

	add(o: any): void {
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
	}

	get(x: number, y: number, w: number, h: number, cb: (o: any) => void): void {
		const t = this;
		const os = t.o;

		for (let i = 0; i < os.length; i++) {
			cb(os[i]);
		}

		if (t.q != null) {
			t.quads(x, y, w, h, (q) => {
				q.get(x, y, w, h, cb);
			});
		}
	}

	clear(): void {
		this.o.length = 0;
		this.q = null;
	}
}

Object.assign(Quadtree.prototype, {
	split: Quadtree.prototype.split,
	quads: Quadtree.prototype.quads,
	add: Quadtree.prototype.add,
	get: Quadtree.prototype.get,
	clear: Quadtree.prototype.clear,
});

const { round, min, max, ceil } = Math;

function roundDec(val: number, dec: number): any {
	return Math.round(val * (dec = 10 ** dec)) / dec;
}

export const SPACE_BETWEEN = 1;
export const SPACE_AROUND = 2;
export const SPACE_EVENLY = 3;
export const inf = Infinity;

const coord = (i: number, offs: number, iwid: number, gap: number): any =>
	roundDec(offs + i * (iwid + gap), 6);

export function distr(
	numItems: number,
	sizeFactor: number,
	justify: number,
	onlyIdx: number | null,
	each: {
		(i: any, offPct: number, dimPct: number): void;
		(arg0: number, arg1: any, arg2: any): void;
	},
): any {
	const space = 1 - sizeFactor;

	let gap =
		justify == SPACE_BETWEEN
			? space / (numItems - 1)
			: justify == SPACE_AROUND
			? space / numItems
			: justify == SPACE_EVENLY
			? space / (numItems + 1)
			: 0;

	if (Number.isNaN(gap) || gap == Infinity) gap = 0;

	const offs =
		justify == SPACE_BETWEEN
			? 0
			: justify == SPACE_AROUND
			? gap / 2
			: justify == SPACE_EVENLY
			? gap
			: 0;

	const iwid = sizeFactor / numItems;
	const _iwid = roundDec(iwid, 6);

	if (onlyIdx == null) {
		for (let i = 0; i < numItems; i++) each(i, coord(i, offs, iwid, gap), _iwid);
	} else each(onlyIdx, coord(onlyIdx, offs, iwid, gap), _iwid);
}

function timelinePlugin(opts: any): any {
	const { mode, count, fill, stroke, laneWidthOption, showGrid } = opts;

	const pxRatio = devicePixelRatio;

	const laneWidth = laneWidthOption ?? 0.9;

	const laneDistr = SPACE_BETWEEN;

	const font = `${round(14 * pxRatio)}px Arial`;

	function walk(
		yIdx: number | null,
		count: any,
		dim: number,
		draw: {
			(iy: any, y0: any, hgt: any): void;
			(iy: any, y0: any, hgt: any): void;
			(arg0: never, arg1: number, arg2: number): void;
		},
	): any {
		distr(
			count,
			laneWidth,
			laneDistr,
			yIdx,
			(i: any, offPct: number, dimPct: number) => {
				const laneOffPx = dim * offPct;
				const laneWidPx = dim * dimPct;

				draw(i, laneOffPx, laneWidPx);
			},
		);
	}

	const size = opts.size ?? [0.6, Infinity];
	const align = opts.align ?? 0;

	const gapFactor = 1 - size[0];
	const maxWidth = (size[1] ?? inf) * pxRatio;

	const fillPaths = new Map();
	const strokePaths = new Map();

	function drawBoxes(ctx: {
		fillStyle: any;
		fill: (arg0: any) => void;
		strokeStyle: any;
		stroke: (arg0: any) => void;
	}): any {
		fillPaths.forEach((fillPath, fillStyle) => {
			ctx.fillStyle = fillStyle;
			ctx.fill(fillPath);
		});

		strokePaths.forEach((strokePath, strokeStyle) => {
			ctx.strokeStyle = strokeStyle;
			ctx.stroke(strokePath);
		});

		fillPaths.clear();
		strokePaths.clear();
	}

	function putBox(
		ctx: any,
		rect: RectH,
		xOff: number,
		yOff: number,
		lft: number,
		top: number,
		wid: number,
		hgt: number,
		strokeWidth: number,
		iy: number,
		ix: number,
		value: number | null,
	): any {
		const fillStyle = fill(iy + 1, ix, value);
		let fillPath = fillPaths.get(fillStyle);

		if (fillPath == null) fillPaths.set(fillStyle, (fillPath = new Path2D()));

		rect(fillPath, lft, top, wid, hgt);

		if (strokeWidth) {
			const strokeStyle = stroke(iy + 1, ix, value);
			let strokePath = strokePaths.get(strokeStyle);

			if (strokePath == null)
				strokePaths.set(strokeStyle, (strokePath = new Path2D()));

			rect(
				strokePath,
				lft + strokeWidth / 2,
				top + strokeWidth / 2,
				wid - strokeWidth,
				hgt - strokeWidth,
			);
		}

		qt.add({
			x: round(lft - xOff),
			y: round(top - yOff),
			w: wid,
			h: hgt,
			sidx: iy + 1,
			didx: ix,
		});
	}

	function drawPaths(
		u: import('uplot'),
		sidx: number,
		idx0: any,
		idx1: number,
	): any {
		uPlot.orient(
			u,
			sidx,
			(
				series,
				dataX,
				dataY,
				scaleX,
				scaleY,
				valToPosX,
				valToPosY,
				xOff,
				yOff,
				xDim,
				yDim,
				moveTo,
				lineTo,
				rect,
			) => {
				const strokeWidth = round((series.width || 0) * pxRatio);

				u.ctx.save();
				rect(u.ctx, u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
				u.ctx.clip();

				walk(sidx - 1, count, yDim, (iy: any, y0: number, hgt: any) => {
					// draw spans
					if (mode == 1) {
						for (let ix = 0; ix < dataY.length; ix++) {
							if (dataY[ix] != null) {
								const lft = round(valToPosX(dataX[ix], scaleX, xDim, xOff));

								let nextIx = ix;
								while (dataY[++nextIx] === undefined && nextIx < dataY.length) {}

								// to now (not to end of chart)
								const rgt =
									nextIx == dataY.length
										? xOff + xDim + strokeWidth
										: round(valToPosX(dataX[nextIx], scaleX, xDim, xOff));

								putBox(
									u.ctx,
									rect,
									xOff,
									yOff,
									lft,
									round(yOff + y0),
									rgt - lft,
									round(hgt),
									strokeWidth,
									iy,
									ix,
									dataY[ix],
								);

								ix = nextIx - 1;
							}
						}
					}
					// draw matrix
					else {
						const colWid =
							valToPosX(dataX[1], scaleX, xDim, xOff) -
							valToPosX(dataX[0], scaleX, xDim, xOff);
						const gapWid = colWid * gapFactor;
						const barWid = round(min(maxWidth, colWid - gapWid) - strokeWidth);
						const xShift = align == 1 ? 0 : align == -1 ? barWid : barWid / 2;

						for (let ix = idx0; ix <= idx1; ix++) {
							if (dataY[ix] != null) {
								// TODO: all xPos can be pre-computed once for all series in aligned set
								const lft = valToPosX(dataX[ix], scaleX, xDim, xOff);

								putBox(
									u.ctx,
									rect,
									xOff,
									yOff,
									round(lft - xShift),
									round(yOff + y0),
									barWid,
									round(hgt),
									strokeWidth,
									iy,
									ix,
									dataY[ix],
								);
							}
						}
					}
				});

				u.ctx.lineWidth = strokeWidth;
				drawBoxes(u.ctx);

				u.ctx.restore();
			},
		);

		return null;
	}

	function drawPoints(u: import('uplot'), sidx: number, i0: any, i1: any): any {
		u.ctx.save();
		u.ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
		u.ctx.clip();

		u.ctx.font = font;
		u.ctx.fillStyle = 'black';
		u.ctx.textAlign = mode == 1 ? 'left' : 'center';
		u.ctx.textBaseline = 'middle';

		uPlot.orient(
			u,
			sidx,
			(
				series,
				dataX,
				dataY,
				scaleX,
				scaleY,
				valToPosX,
				valToPosY,
				xOff,
				yOff,
				xDim,
				yDim,
				moveTo,
				lineTo,
				rect,
			) => {
				const strokeWidth = round((series.width || 0) * pxRatio);
				const textOffset = mode == 1 ? strokeWidth + 2 : 0;

				const y = round(yOff + yMids[sidx - 1]);
				if (opts.displayTimelineValue) {
					for (let ix = 0; ix < dataY.length; ix++) {
						if (dataY[ix] != null) {
							const x = valToPosX(dataX[ix], scaleX, xDim, xOff) + textOffset;
							u.ctx.fillText(String(dataY[ix]), x, y);
						}
					}
				}
			},
		);

		u.ctx.restore();

		return false;
	}

	let qt: {
		add: (arg0: { x: any; y: any; w: any; h: any; sidx: any; didx: any }) => void;
		clear: () => void;
		get: (
			arg0: any,
			arg1: any,
			arg2: number,
			arg3: number,
			arg4: (o: any) => void,
		) => void;
	};
	const hovered = Array(count).fill(null);

	let yMids = Array(count).fill(0);
	const ySplits = Array(count).fill(0);

	const fmtDate = uPlot.fmtDate('{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}');
	let legendTimeValueEl: { textContent: any } | null = null;

	return {
		hooks: {
			init: (u: { root: { querySelector: (arg0: string) => any } }): any => {
				legendTimeValueEl = u.root.querySelector('.u-series:first-child .u-value');
			},
			drawClear: (u: {
				bbox: { width: any; height: any };
				series: any[];
			}): any => {
				qt = qt || new Quadtree(0, 0, u.bbox.width, u.bbox.height);

				qt.clear();

				// force-clear the path cache to cause drawBars() to rebuild new quadtree
				u.series.forEach((s: { _paths: null }) => {
					s._paths = null;
				});
			},
			setCursor: (u: {
				posToVal: (arg0: any, arg1: string) => any;
				cursor: { left: any };
				scales: { x: { time: any } };
			}): any => {
				if (mode == 1 && legendTimeValueEl) {
					const val = u.posToVal(u.cursor.left, 'x');
					legendTimeValueEl.textContent = u.scales.x.time
						? fmtDate(new Date(val * 1e3))
						: val.toFixed(2);
				}
			},
		},
		opts: (u: { series: { label: any }[] }, opts: any): any => {
			uPlot.assign(opts, {
				cursor: {
					//	x: false,
					y: false,
					dataIdx: (
						u: { cursor: { left: number } },
						seriesIdx: number,
						closestIdx: any,
						xValue: any,
					) => {
						if (seriesIdx == 0) return closestIdx;

						const cx = round(u.cursor.left * pxRatio);

						if (cx >= 0) {
							const cy = yMids[seriesIdx - 1];

							hovered[seriesIdx - 1] = null;

							qt.get(cx, cy, 1, 1, (o: { x: any; y: any; w: any; h: any }) => {
								if (pointWithin(cx, cy, o.x, o.y, o.x + o.w, o.y + o.h))
									hovered[seriesIdx - 1] = o;
							});
						}

						return hovered[seriesIdx - 1]?.didx;
					},
					points: {
						fill: 'rgba(0,0,0,0.3)',
						bbox: (u: any, seriesIdx: number) => {
							const hRect = hovered[seriesIdx - 1];

							return {
								left: hRect ? round(hRect.x / devicePixelRatio) : -10,
								top: hRect ? round(hRect.y / devicePixelRatio) : -10,
								width: hRect ? round(hRect.w / devicePixelRatio) : 0,
								height: hRect ? round(hRect.h / devicePixelRatio) : 0,
							};
						},
					},
				},
				scales: {
					x: {
						range(u: { data: number[][] }, min: number, max: number) {
							if (mode == 2) {
								const colWid = u.data[0][1] - u.data[0][0];
								const scalePad = colWid / 2;

								if (min <= u.data[0][0]) min = u.data[0][0] - scalePad;

								const lastIdx = u.data[0].length - 1;

								if (max >= u.data[0][lastIdx]) max = u.data[0][lastIdx] + scalePad;
							}

							return [min, max];
						},
					},
					y: {
						range: [0, 1],
					},
				},
			});

			uPlot.assign(opts.axes[0], {
				splits:
					mode == 2
						? (
								u: { data: any[][] },
								axisIdx: any,
								scaleMin: number,
								scaleMax: number,
								foundIncr: number,
								foundSpace: any,
						  ): any => {
								const splits = [];

								const dataIncr = u.data[0][1] - u.data[0][0];
								const skipFactor = ceil(foundIncr / dataIncr);

								for (let i = 0; i < u.data[0].length; i += skipFactor) {
									const v = u.data[0][i];

									if (v >= scaleMin && v <= scaleMax) splits.push(v);
								}

								return splits;
						  }
						: null,
				grid: {
					show: showGrid ?? mode != 2,
				},
			});

			uPlot.assign(opts.axes[1], {
				splits: (
					u: {
						bbox: { height: any };
						posToVal: (arg0: number, arg1: string) => any;
					},
					axisIdx: any,
				) => {
					walk(null, count, u.bbox.height, (iy: any, y0: number, hgt: number) => {
						// vertical midpoints of each series' timeline (stored relative to .u-over)
						yMids[iy] = round(y0 + hgt / 2);
						ySplits[iy] = u.posToVal(yMids[iy] / pxRatio, 'y');
					});

					return ySplits;
				},
				values: () =>
					Array(count)
						.fill(null)
						.map((v, i) => u.series[i + 1].label),
				gap: 15,
				size: 70,
				grid: { show: false },
				ticks: { show: false },

				side: 3,
			});

			opts.series.forEach((s: any, i: number) => {
				if (i > 0) {
					uPlot.assign(s, {
						//	width: 0,
						//	pxAlign: false,
						//	stroke: "rgba(255,0,0,0.5)",
						paths: drawPaths,
						points: {
							show: drawPoints,
						},
					});
				}
			});
		},
	};
}

export default timelinePlugin;
