/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
import uPlot from 'uplot';

import { distr, SPACE_BETWEEN } from './helper/distr';
import { pointWithin, Quadtree } from './helper/quadtree';

interface SeriesBarsPluginOptions {
	radius: number;
	ignore: number[];
	ori: number;
	dir: number;
	stacked?: boolean;
	disp: any;
	options: uPlot.Options;
}

export function seriesBarsPlugin(opts: SeriesBarsPluginOptions): any {
	let pxRatio: number;
	let font: string;

	const { ignore = [], options } = opts;

	const radius = opts.radius ?? 0;

	function setPxRatio(): void {
		pxRatio = devicePixelRatio;
		font = `${Math.round(10 * pxRatio)}px Arial`;
	}

	setPxRatio();

	window.addEventListener('dppxchange', setPxRatio);

	const { ori } = opts;
	const { dir } = opts;
	const { stacked } = opts;

	const groupWidth = 0.9;
	const groupDistr = SPACE_BETWEEN;

	const barWidth = 1;
	const barDistr = SPACE_BETWEEN;

	function distrTwo(
		groupCount: number,
		barCount: number,
		barSpread = true,
		_groupWidth = groupWidth,
	): {
		offs: any[];
		size: any[];
	}[] {
		const out = Array.from({ length: barCount }, () => ({
			offs: Array(groupCount).fill(0),
			size: Array(groupCount).fill(0),
		}));

		distr(
			groupCount,
			_groupWidth,
			groupDistr,
			null,
			(groupIdx: number, groupOffPct: number, groupDimPct: number) => {
				distr(
					barCount,
					barWidth,
					barDistr,
					null,
					(barIdx: number, barOffPct: number, barDimPct: number) => {
						out[barIdx].offs[groupIdx] =
							groupOffPct + (barSpread ? groupDimPct * barOffPct : 0);
						out[barIdx].size[groupIdx] = groupDimPct * (barSpread ? barDimPct : 1);
					},
				);
			},
		);

		return out;
	}

	let barsPctLayout: any[];
	let barsColors: unknown[];
	let qt: Quadtree;

	const barsBuilder = uPlot.paths?.bars?.({
		radius,
		disp: {
			x0: {
				unit: 2,
				values: (u, seriesIdx) => barsPctLayout[seriesIdx].offs,
			},
			size: {
				unit: 2,
				values: (u, seriesIdx) => barsPctLayout[seriesIdx].size,
			},
			...opts.disp,
		},
		each: (u, seriesIdx, dataIdx, lft, top, wid, hgt) => {
			lft -= u.bbox.left;
			top -= u.bbox.top;
			qt.add({ x: lft, y: top, w: wid, h: hgt, sidx: seriesIdx, didx: dataIdx });
		},
	});

	function drawPoints(u: uPlot, sidx: number, i0: any, i1: any): void {
		u.ctx.save();

		u.ctx.font = font;
		u.ctx.fillStyle = 'black';

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
				const _dir = dir * (ori === 0 ? 1 : -1);

				const wid = Math.round(barsPctLayout[sidx].size[0] * xDim);

				barsPctLayout[sidx].offs.forEach((offs: number, ix: number) => {
					if (dataY[ix] != null) {
						const x0 = xDim * offs;
						const lft = Math.round(xOff + (_dir === 1 ? x0 : xDim - x0 - wid));
						const barWid = Math.round(wid);

						const yPos = valToPosY(dataY[ix], scaleY, yDim, yOff);

						const x = ori === 0 ? Math.round(lft + barWid / 2) : Math.round(yPos);
						const y = ori === 0 ? Math.round(yPos) : Math.round(lft + barWid / 2);

						u.ctx.textAlign =
							ori === 0 ? 'center' : dataY[ix] >= 0 ? 'left' : 'right';
						u.ctx.textBaseline =
							ori === 1 ? 'middle' : dataY[ix] >= 0 ? 'bottom' : 'top';

						u.ctx.fillText(dataY[ix], x, y);
					}
				});
			},
		);

		u.ctx.restore();
	}

	function range(
		u: any,
		dataMin: any,
		dataMax: number,
	): [number | null, number | null] {
		const [, max] = uPlot.rangeNum(0, dataMax, 0.05, true);
		return [0, max];
	}

	return {
		hooks: {
			drawClear: (u: {
				bbox: { width: number; height: number };
				series: any[];
				data: string | any[];
			}): void => {
				qt = qt || new Quadtree(0, 0, u.bbox.width, u.bbox.height);

				qt.clear();

				u.series.forEach((s: { _paths: null }) => {
					s._paths = null;
				});

				const barsPctLayout: any[] = [].concat(
					distrTwo(
						u.data[0].length,
						u.series.length - 1 - ignore.length,
						!stacked,
						groupWidth,
					),
				);

				if (opts.disp?.fill != null) {
					barsColors = [];

					for (let i = 1; i < u.data.length; i++) {
						barsColors.push({
							fill: opts.disp.fill.values(u, i),
							stroke: opts.disp.stroke.values(u, i),
						});
					}
				}
			},
		},
		opts: (_: any, opts: any): void => {
			const yScaleOpts = {
				range,
				ori: ori === 0 ? 1 : 0,
			};

			let hRect: {
				sidx: any;
				didx: any;
				x: number;
				y: number;
				w: number;
				h: number;
			} | null;

			uPlot.assign(opts, {
				select: { show: false },
				cursor: {
					x: false,
					y: false,
					dataIdx: (
						u: { cursor: { left: number; top: number } },
						seriesIdx: number,
					) => {
						if (seriesIdx === 1) {
							hRect = null;

							const cx = u.cursor.left * pxRatio;
							const cy = u.cursor.top * pxRatio;

							qt.get(
								cx,
								cy,
								1,
								1,
								(o: { sidx: any; didx: any; x: any; y: any; w: any; h: any }) => {
									if (pointWithin(cx, cy, o.x, o.y, o.x + o.w, o.y + o.h)) hRect = o;
								},
							);
						}

						return hRect && seriesIdx === hRect.sidx ? hRect.didx : null;
					},
					points: {
						fill: 'rgba(255,255,255, 0.3)',
						bbox: (u: any, seriesIdx: any) => {
							const isHovered = hRect && seriesIdx === hRect.sidx;

							return {
								left: isHovered ? (hRect?.x ?? 0) / pxRatio : -10,
								top: isHovered ? (hRect?.y ?? 0) / pxRatio : -10,
								width: isHovered ? (hRect?.w ?? 0) / pxRatio : 0,
								height: isHovered ? (hRect?.h ?? 0) / pxRatio : 0,
							};
						},
					},
				},
				scales: {
					x: {
						time: false,
						distr: 2,
						ori,
						dir,
						range: (u: { data: (string | any[])[] }, min: number, max: number) => {
							min = 0;
							max = Math.max(1, u.data[0].length - 1);

							let pctOffset = 0;

							distr(
								u.data[0].length,
								groupWidth,
								groupDistr,
								0,
								(di, lftPct, widPct) => {
									pctOffset = lftPct + widPct / 2;
								},
							);

							const rn = max - min;

							if (pctOffset === 0.5) min -= rn;
							else {
								const upScale = 1 / (1 - pctOffset * 2);
								const offset = (upScale * rn - rn) / 2;

								min -= offset;
								max += offset;
							}

							return [min, max];
						},
					},
					rend: yScaleOpts,
					size: yScaleOpts,
					mem: yScaleOpts,
					inter: yScaleOpts,
					toggle: yScaleOpts,
				},
			});

			if (ori === 1) {
				options.padding = [0, null, 0, null];
			}

			options.series.forEach((s: Record<string, unknown>, i: number) => {
				if (i > 0 && !ignore.includes(i)) {
					uPlot.assign(s, {
						paths: barsBuilder,
						points: {
							show: drawPoints,
						},
					});
				}
			});
		},
	};
}
