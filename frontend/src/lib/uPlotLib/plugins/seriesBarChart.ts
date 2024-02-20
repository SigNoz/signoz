/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-param-reassign */
/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable sonarjs/cognitive-complexity */
import { PANEL_TYPES } from 'constants/queryBuilder';
import uPlot from 'uplot';

import getGridColor from '../utils/getGridColor';
import { distr, SPACE_BETWEEN } from './helper/distr';
import { pointWithin, Quadtree } from './helper/quadtree';
import { getXAxisScale } from '../utils/getXAxisScale';

// export function seriesBarsPlugin(opts): uPlot.Plugin {
// 	if (opts.panelType !== PANEL_TYPES.BAR) {
// 		return {};
// 	}
// 	let pxRatio: number;
// 	let font: string;

// 	const { ignore = [] } = opts;

// 	const radius = opts.radius ?? 0;

// 	function setPxRatio(): void {
// 		pxRatio = devicePixelRatio;
// 		font = `${Math.round(10 * pxRatio)}px Arial`;
// 	}

// 	setPxRatio();

// 	window.addEventListener('dppxchange', setPxRatio);

// 	const { ori } = opts;
// 	const { dir } = opts;
// 	const { stacked } = opts;

// 	const groupWidth = 0.9;
// 	const groupDistr = SPACE_BETWEEN;

// 	const barWidth = 1;
// 	const barDistr = SPACE_BETWEEN;

// 	function distrTwo(
// 		groupCount: number,
// 		barCount: number,
// 		barSpread = true,
// 		_groupWidth = groupWidth,
// 	): any {
// 		const out = Array.from({ length: barCount }, () => ({
// 			offs: Array(groupCount).fill(0),
// 			size: Array(groupCount).fill(0),
// 		}));

// 		distr(
// 			groupCount,
// 			_groupWidth,
// 			groupDistr,
// 			null,
// 			(groupIdx, groupOffPct, groupDimPct) => {
// 				distr(
// 					barCount,
// 					barWidth,
// 					barDistr,
// 					null,
// 					(barIdx, barOffPct, barDimPct) => {
// 						out[barIdx].offs[groupIdx] =
// 							groupOffPct + (barSpread ? groupDimPct * barOffPct : 0);
// 						out[barIdx].size[groupIdx] = groupDimPct * (barSpread ? barDimPct : 1);
// 					},
// 				);
// 			},
// 		);

// 		return out;
// 	}

// 	let barsPctLayout: Array<null | { offs: number[]; size: number[] }>;
// 	// eslint-disable-next-line sonarjs/no-unused-collection
// 	let barsColors: Array<null | {
// 		fill: Array<string | null>;
// 		stroke: Array<string | null>;
// 	}>;
// 	let qt: Quadtree;

// 	const barsBuilder = uPlot.paths.bars!({
// 		radius,
// 		disp: {
// 			x0: {
// 				unit: 2,
// 				//	discr: false, (unary, discrete, continuous)
// 				values: (u, seriesIdx) => barsPctLayout[seriesIdx]?.offs,
// 			},
// 			size: {
// 				unit: 2,
// 				//	discr: true,
// 				values: (u, seriesIdx) => barsPctLayout[seriesIdx]?.size || [],
// 			},
// 			...opts.disp,
// 			/*
// 			// e.g. variable size via scale (will compute offsets from known values)
// 			x1: {
// 				units: 1,
// 				values: (u, seriesIdx, idx0, idx1) => bucketEnds[idx],
// 			},
// 		*/
// 		},
// 		each: (u, seriesIdx, dataIdx, lft, top, wid, hgt) => {
// 			// we get back raw canvas coords (included axes & padding). translate to the plotting area origin
// 			console.log({ lft, top, wid, hgt });
// 			lft -= u.bbox.left;
// 			top -= u.bbox.top;
// 			qt.add({ x: lft, y: top, w: wid, h: hgt, sidx: seriesIdx, didx: dataIdx });
// 		},
// 	});

// 	function drawPoints(u: uPlot, sidx: number): void {
// 		u.ctx.save();

// 		u.ctx.font = font;
// 		u.ctx.fillStyle = 'black';

// 		uPlot.orient(
// 			u,
// 			sidx,
// 			(
// 				series,
// 				dataX,
// 				dataY,
// 				scaleX,
// 				scaleY,
// 				valToPosX,
// 				valToPosY,
// 				xOff,
// 				yOff,
// 				xDim,
// 				yDim,
// 				moveTo,
// 				lineTo,
// 				rect,
// 			) => {
// 				const _dir = dir * (ori === 0 ? 1 : -1);

// 				const wid = Math.round(barsPctLayout[sidx]!.size[0] * xDim);

// 				barsPctLayout[sidx]!.offs.forEach((offs, ix) => {
// 					if (dataY[ix] != null) {
// 						const x0 = xDim * offs;
// 						const lft = Math.round(xOff + (_dir === 1 ? x0 : xDim - x0 - wid));
// 						const barWid = Math.round(wid);

// 						const yPos = valToPosY(dataY[ix]!, scaleY, yDim, yOff);

// 						const x = ori === 0 ? Math.round(lft + barWid / 2) : Math.round(yPos);
// 						const y = ori === 0 ? Math.round(yPos) : Math.round(lft + barWid / 2);

// 						u.ctx.textAlign =
// 							ori === 0 ? 'center' : dataY[ix]! >= 0 ? 'left' : 'right';
// 						u.ctx.textBaseline =
// 							ori === 1 ? 'middle' : dataY[ix]! >= 0 ? 'bottom' : 'top';

// 						u.ctx.fillText(dataY[ix]!.toString(), x, y);
// 					}
// 				});
// 			},
// 		);

// 		u.ctx.restore();
// 	}

// 	function range(
// 		u: uPlot,
// 		dataMin: number,
// 		dataMax: number,
// 	): [number | null, number | null] {
// 		const [min, max] = uPlot.rangeNum(0, dataMax, 0.05, true);
// 		return [0, max];
// 	}

// 	return {
// 		hooks: {
// 			drawClear: (u): void => {
// 				qt = qt || new Quadtree(0, 0, u.bbox.width, u.bbox.height);

// 				qt.clear();

// 				// force-clear the path cache to cause drawBars() to rebuild new quadtree
// 				u.series.forEach((s) => {
// 					// @ts-ignore
// 					s._paths = null;
// 				});

// 				barsPctLayout = [null, ...distrTwo(u.data[0].length, u.data.length - 1)];

// 				// TODOL only do on setData, not every redraw
// 				if (opts.disp?.fill != null) {
// 					barsColors = [null];

// 					for (let i = 1; i < u.data.length; i++) {
// 						barsColors.push({
// 							fill: opts.disp.fill.values(u, i),
// 							stroke: opts.disp.stroke.values(u, i),
// 						});
// 					}
// 				}
// 			},
// 		},
// 		opts: (u, opts) => {
// 			const yScaleOpts = {
// 				range,
// 				ori: ori === 0 ? 1 : 0,
// 			};

// 			// hovered
// 			let hRect;

// 			uPlot.assign(opts, {
// 				select: { show: false },
// 				cursor: {
// 					x: false,
// 					y: false,
// 					dataIdx: (u, seriesIdx) => {
// 						if (seriesIdx == 1) {
// 							hRect = null;

// 							const cx = u.cursor.left * pxRatio;
// 							const cy = u.cursor.top * pxRatio;

// 							qt.get(cx, cy, 1, 1, (o) => {
// 								if (pointWithin(cx, cy, o.x, o.y, o.x + o.w, o.y + o.h)) hRect = o;
// 							});
// 						}

// 						return hRect && seriesIdx === hRect.sidx ? hRect.didx : null;
// 					},
// 					points: {
// 						fill: 'rgba(255,255,255, 0.3)',
// 						bbox: (u: uPlot, seriesIdx: number) => {
// 							const isHovered = hRect && seriesIdx == hRect.sidx;

// 							return {
// 								left: isHovered ? hRect.x / pxRatio : -10,
// 								top: isHovered ? hRect.y / pxRatio : -10,
// 								width: isHovered ? hRect.w / pxRatio : 0,
// 								height: isHovered ? hRect.h / pxRatio : 0,
// 							};
// 						},
// 					},
// 				},
// 				scales: {
// 					x: {
// 						time: false,
// 						distr: 2,
// 						ori,
// 						dir,
// 						//	auto: true,
// 						range: (u, min, max) => {
// 							min = 0;
// 							max = Math.max(1, u.data[0].length - 1);

// 							let pctOffset = 0;

// 							distr(
// 								u.data[0].length,
// 								groupWidth,
// 								groupDistr,
// 								0,
// 								(di, lftPct, widPct) => {
// 									pctOffset = lftPct + widPct / 2;
// 								},
// 							);

// 							const rn = max - min;

// 							if (pctOffset === 0.5) min -= rn;
// 							else {
// 								const upScale = 1 / (1 - pctOffset * 2);
// 								const offset = (upScale * rn - rn) / 2;

// 								min -= offset;
// 								max += offset;
// 							}

// 							return [min, max];
// 						},
// 					},
// 					rend: yScaleOpts,
// 					size: yScaleOpts,
// 					mem: yScaleOpts,
// 					inter: yScaleOpts,
// 					toggle: yScaleOpts,
// 				},
// 			});

// 			if (ori === 1) {
// 				opts.padding = [0, null, 0, null];
// 			}

// 			uPlot.assign(opts.axes[0], {
// 				splits: (u, axisIdx) => {
// 					const _dir = dir * (ori === 0 ? 1 : -1);
// 					const splits2 = u._data[0].slice();
// 					return _dir === 1 ? splits2 : splits2.reverse();
// 				},
// 				values: (u) => u.data[0],
// 				gap: 15,
// 				size: ori === 0 ? 40 : 150,
// 				labelSize: 20,
// 				grid: { show: false },
// 				ticks: { show: false },
// 				side: ori === 0 ? 2 : 3,
// 			});

// 			opts.series.forEach((s, i) => {
// 				if (i > 0 && !ignore.includes(i)) {
// 					uPlot.assign(s, {
// 						//	pxAlign: false,
// 						//	stroke: "rgba(255,0,0,0.5)",
// 						paths: barsBuilder,
// 						points: {
// 							show: drawPoints,
// 						},
// 					});
// 				}
// 			});
// 		},
// 	};
// }

export function seriesBarsPlugin(
	opts,
	panelType: PANEL_TYPES,
	isDarkMode: boolean,
) {
	console.log({ panelType });
	if (panelType !== PANEL_TYPES.BAR) {
		return {};
	}
	let pxRatio;
	let font;

	const { ignore = [] } = opts;

	const radius = opts.radius ?? 0;

	function setPxRatio() {
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
		groupCount,
		barCount,
		barSpread = true,
		_groupWidth = groupWidth,
	) {
		const out = Array.from({ length: barCount }, () => ({
			offs: Array(groupCount).fill(0),
			size: Array(groupCount).fill(0),
		}));

		distr(
			groupCount,
			_groupWidth,
			groupDistr,
			null,
			(groupIdx, groupOffPct, groupDimPct) => {
				distr(
					barCount,
					barWidth,
					barDistr,
					null,
					(barIdx, barOffPct, barDimPct) => {
						out[barIdx].offs[groupIdx] =
							groupOffPct + (barSpread ? groupDimPct * barOffPct : 0);
						out[barIdx].size[groupIdx] = groupDimPct * (barSpread ? barDimPct : 1);
					},
				);
			},
		);

		return out;
	}

	let barsPctLayout;
	let barsColors;
	let qt;

	const barsBuilder = uPlot.paths.bars({
		radius,
		disp: {
			x0: {
				unit: 2,
				//	discr: false, (unary, discrete, continuous)
				values: (u, seriesIdx, idx0, idx1) => barsPctLayout[seriesIdx].offs,
			},
			size: {
				unit: 2,
				//	discr: true,
				values: (u, seriesIdx, idx0, idx1) => barsPctLayout[seriesIdx].size,
			},
			...opts.disp,
			/*
			// e.g. variable size via scale (will compute offsets from known values)
			x1: {
				units: 1,
				values: (u, seriesIdx, idx0, idx1) => bucketEnds[idx],
			},
		*/
		},
		each: (u, seriesIdx, dataIdx, lft, top, wid, hgt) => {
			// we get back raw canvas coords (included axes & padding). translate to the plotting area origin
			lft -= u.bbox.left;
			top -= u.bbox.top;
			qt.add({ x: lft, y: top, w: wid, h: hgt, sidx: seriesIdx, didx: dataIdx });
		},
	});

	function drawPoints(u, sidx, i0, i1) {
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
				const _dir = dir * (ori == 0 ? 1 : -1);

				const wid = Math.round(barsPctLayout[sidx].size[0] * xDim);

				barsPctLayout[sidx].offs.forEach((offs, ix) => {
					if (dataY[ix] != null) {
						const x0 = xDim * offs;
						const lft = Math.round(xOff + (_dir == 1 ? x0 : xDim - x0 - wid));
						const barWid = Math.round(wid);

						const yPos = valToPosY(dataY[ix], scaleY, yDim, yOff);

						const x = ori == 0 ? Math.round(lft + barWid / 2) : Math.round(yPos);
						const y = ori == 0 ? Math.round(yPos) : Math.round(lft + barWid / 2);

						u.ctx.textAlign = ori == 0 ? 'center' : dataY[ix] >= 0 ? 'left' : 'right';
						u.ctx.textBaseline =
							ori == 1 ? 'middle' : dataY[ix] >= 0 ? 'bottom' : 'top';

						u.ctx.fillText(dataY[ix], x, y);
					}
				});
			},
		);

		u.ctx.restore();
	}

	function range(u, dataMin, dataMax) {
		const [min, max] = uPlot.rangeNum(0, dataMax, 0.05, true);
		return [0, max];
	}

	return {
		hooks: {
			drawClear: (u) => {
				qt = qt || new Quadtree(0, 0, u.bbox.width, u.bbox.height);

				qt.clear();

				// force-clear the path cache to cause drawBars() to rebuild new quadtree
				u.series.forEach((s) => {
					s._paths = null;
				});

				barsPctLayout = [null].concat(
					distrTwo(
						u.data[0].length,
						u.series.length - 1 - ignore.length,
						!stacked,
						groupWidth,
					),
				);

				// TODOL only do on setData, not every redraw
				if (opts.disp?.fill != null) {
					barsColors = [null];

					for (let i = 1; i < u.data.length; i++) {
						barsColors.push({
							fill: opts.disp.fill.values(u, i),
							stroke: opts.disp.stroke.values(u, i),
						});
					}
				}
			},
		},
		opts: (u, opts) => {
			const yScaleOpts = {
				range,
				ori: ori == 0 ? 1 : 0,
			};

			// hovered
			let hRect;

			uPlot.assign(opts, {
				select: { show: false },
				cursor: {
					x: false,
					y: false,
					dataIdx: (u, seriesIdx) => {
						if (seriesIdx == 1) {
							hRect = null;

							const cx = u.cursor.left * pxRatio;
							const cy = u.cursor.top * pxRatio;

							qt.get(cx, cy, 1, 1, (o) => {
								if (pointWithin(cx, cy, o.x, o.y, o.x + o.w, o.y + o.h)) hRect = o;
							});
						}

						return hRect && seriesIdx == hRect.sidx ? hRect.didx : null;
					},
					points: {
						fill: 'rgba(255,255,255, 0.3)',
						bbox: (u, seriesIdx) => {
							const isHovered = hRect && seriesIdx == hRect.sidx;

							return {
								left: isHovered ? hRect.x / pxRatio : -10,
								top: isHovered ? hRect.y / pxRatio : -10,
								width: isHovered ? hRect.w / pxRatio : 0,
								height: isHovered ? hRect.h / pxRatio : 0,
							};
						},
					},
				},
				scales: {
					x: {
						time: true,
						distr: 2,
						ori,
						dir,
							auto: true,
						range: (u, min, max) => {
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

							if (pctOffset == 0.5) min -= rn;
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

			if (ori == 1) {
				opts.padding = [0, null, 0, null];
			}

			uPlot.assign(opts.axes[0], {
				splits: (u, axisIdx) => {
					console.log({ rajat: u });
					const _dir = dir * (ori == 0 ? 1 : -1);
					const splits2 = u._data[0].slice();
					return _dir == 1 ? splits2 : splits2.reverse();
				},
				values: (u, t) => {
					console.log({ t });
					return u.data[0];
				},
				gap: 5,
				size: ori == 0 ? 40 : 150,
				labelSize: 20,
				grid: {
					stroke: getGridColor(isDarkMode), // Color of the grid lines
					width: 0.2, // Width of the grid lines,
					show: true,
				},
				ticks: {
					width: 0.3, // Width of the tick lines,
					show: true,
				},

				side: ori == 0 ? 2 : 3,
			});

			opts.series.forEach((s, i) => {
				if (i > 0 && !ignore.includes(i)) {
					uPlot.assign(s, {
						//	pxAlign: false,
						//	stroke: "rgba(255,0,0,0.5)",
						paths: barsBuilder,
						points: {
							// show: drawPoints,
						},
					});
				}
			});
		},
	};
}
