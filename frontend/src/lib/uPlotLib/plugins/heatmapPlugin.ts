import uPlot from 'uplot';

type HeatmapPluginOptions = {
	palette: string[];
	showGrid?: boolean;
	gridColor?: string;
	hoverStroke?: string;
	hoverLineWidth?: number;
	emptyColor?: string;
	onHover?: (
		hoverData: { xi: number; yi: number; count: number } | null,
		mousePos: { x: number; y: number },
	) => void;
	onClick?: (
		data: { xi: number; yi: number; count: number } | null,
		mousePos: { x: number; y: number },
	) => void;
};

const P99_THRESHOLD = 0.99;

function heatmapPlugin(
	opts: HeatmapPluginOptions = { palette: [] },
): uPlot.Plugin {
	const showGrid = opts.showGrid ?? true;
	const hoverStroke = opts.hoverStroke || 'rgba(255,255,255,0.85)';
	const hoverLineWidth = opts.hoverLineWidth ?? 1;
	const emptyColor = opts.emptyColor || 'rgb(18, 20, 22)';
	const { palette } = opts;

	let lastScaleInput: number[][] | null = null;
	let lastCacheKey = '';
	let cachedScale: { maxForScale: number; logDenom: number } | null = null;

	let hoverBox: HTMLDivElement | null = null;
	let overBBox: DOMRect | null = null;

	let hoveredXi: number | null = null;
	let hoveredYi: number | null = null;
	let hoveredCount = 0;
	let cachedStepForHover: number | null = null;
	let lastXValsForHover: number[] | null = null;

	const rectFromBounds = (
		left: number,
		top: number,
		right: number,
		bottom: number,
	): { x: number; y: number; w: number; h: number } => {
		const x = Math.floor(Math.min(left, right));
		const x2 = Math.ceil(Math.max(left, right));
		const y = Math.floor(Math.min(top, bottom));
		const y2 = Math.ceil(Math.max(top, bottom));
		return {
			x,
			y,
			w: Math.max(1, x2 - x),
			h: Math.max(1, y2 - y),
		};
	};

	const pickFillStyle = (normalizedIntensity: number): string => {
		const safeT = Number.isFinite(normalizedIntensity)
			? Math.min(1, Math.max(0, normalizedIntensity))
			: 0;
		const idx = Math.min(palette.length - 1, Math.floor(safeT * palette.length));
		return palette[idx] ?? palette[palette.length - 1];
	};

	const getBucketIndexForY = (
		yVal: number,
		starts: number[],
		ends: number[],
	): number => {
		if (!Number.isFinite(yVal) || starts.length === 0 || ends.length === 0)
			return -1;
		const n = Math.min(starts.length, ends.length);
		for (let i = 0; i < n; i += 1) {
			const s = starts[i];
			const e = ends[i];
			if (Number.isFinite(s) && Number.isFinite(e)) {
				const lo = Math.min(s, e);
				const hi = Math.max(s, e);
				if (yVal >= lo && yVal < hi) return i;
			}
		}

		const last = n - 1;
		if (last >= 0) {
			const lastHi = Math.max(starts[last], ends[last]);
			if (Number.isFinite(lastHi) && yVal === lastHi) return last;
		}

		return -1;
	};

	const normalizeIntensity = (
		value: number,
		maxForScale: number,
		logDenom: number,
	): number => {
		if (!Number.isFinite(value) || value <= 0) return 0;
		if (!Number.isFinite(maxForScale) || maxForScale <= 0) return 1;

		const clampedValue = Math.min(value, maxForScale);
		if (maxForScale <= 2 || !Number.isFinite(logDenom) || logDenom <= 0) {
			return Math.min(1, Math.max(0, clampedValue / maxForScale));
		}

		return Math.min(1, Math.max(0, Math.log1p(clampedValue) / logDenom));
	};

	let lastStepInput: number[] | null = null;
	let cachedStep = 1;

	const getStepSize = (xVals: number[]): number => {
		if (xVals === lastStepInput) return cachedStep;
		if (xVals.length < 2) return 1;

		const diffs: number[] = [];
		for (let i = 1; i < xVals.length; i += 1) {
			const d = xVals[i] - xVals[i - 1];
			if (Number.isFinite(d) && d > 0) diffs.push(d);
		}
		if (diffs.length === 0) {
			lastStepInput = xVals;
			cachedStep = 1;
			return 1;
		}
		diffs.sort((a, b) => a - b);

		const idx = Math.floor((diffs.length - 1) * 0.25);
		const step = diffs[idx] ?? diffs[0] ?? 1;
		const result = step > 0 ? step : 1;

		lastStepInput = xVals;
		cachedStep = result;
		return result;
	};

	const getXValBounds = (
		xVals: number[],
		xi: number,
		fallbackStep: number,
	): { leftVal: number; rightVal: number } => {
		const x = xVals[xi];
		const prev = xi > 0 ? xVals[xi - 1] : undefined;
		const next = xi < xVals.length - 1 ? xVals[xi + 1] : undefined;

		const halfFallback =
			(Number.isFinite(fallbackStep) && fallbackStep > 0 ? fallbackStep : 1) / 2;

		let leftVal =
			typeof prev === 'number' && Number.isFinite(prev) && Number.isFinite(x)
				? (prev + x) / 2
				: x - halfFallback;
		let rightVal =
			typeof next === 'number' && Number.isFinite(next) && Number.isFinite(x)
				? (x + next) / 2
				: x + halfFallback;

		if (
			!Number.isFinite(leftVal) ||
			!Number.isFinite(rightVal) ||
			leftVal === rightVal
		) {
			leftVal = x - halfFallback;
			rightVal = x + halfFallback;
		}

		if (Number.isFinite(x) && Number.isFinite(fallbackStep) && fallbackStep > 0) {
			leftVal = Math.max(leftVal, x - fallbackStep);
			rightVal = Math.min(rightVal, x + fallbackStep);
			if (leftVal === rightVal) {
				leftVal = x - halfFallback;
				rightVal = x + halfFallback;
			}
		}

		return { leftVal, rightVal };
	};

	const getScale = (
		values: number[][],
	): { maxForScale: number; logDenom: number } => {
		let cacheKey = '';
		if (values.length > 0) {
			const lastRow = values[values.length - 1];
			const lastValue =
				lastRow && lastRow.length > 0 ? lastRow[lastRow.length - 1] : 0;
			cacheKey = `${values.length}:${values[0]?.length || 0}:${
				values[0]?.[0] || 0
			}:${lastValue || 0}`;
		}

		if (cachedScale && (lastScaleInput === values || lastCacheKey === cacheKey)) {
			return cachedScale;
		}

		const positiveVals = values
			.flatMap((row) => row)
			.filter((v) => Number.isFinite(v) && v > 0);

		if (positiveVals.length === 0) {
			lastScaleInput = values;
			lastCacheKey = cacheKey;
			cachedScale = { maxForScale: 0, logDenom: 0 };
			return cachedScale;
		}

		positiveVals.sort((a, b) => a - b);
		const maxObserved = positiveVals[positiveVals.length - 1];
		const p99 =
			positiveVals[Math.floor((positiveVals.length - 1) * P99_THRESHOLD)];
		const maxForScale = p99 && p99 < maxObserved ? p99 : maxObserved;

		lastScaleInput = values;
		lastCacheKey = cacheKey;
		cachedScale = {
			maxForScale,
			logDenom: maxForScale > 0 ? Math.log1p(maxForScale) : 0,
		};
		return cachedScale;
	};

	const drawGridLines = (
		ctx: CanvasRenderingContext2D,
		gridRects: Array<{ x: number; y: number; w: number; h: number }>,
		isUniformBuckets: boolean,
	): void => {
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
		ctx.beginPath();

		if (isUniformBuckets && gridRects.length > 0) {
			const xBoundaries = new Set<number>();
			const yBoundaries = new Set<number>();

			gridRects.forEach((r) => {
				xBoundaries.add(r.x);
				xBoundaries.add(r.x + r.w);
				yBoundaries.add(r.y);
				yBoundaries.add(r.y + r.h);
			});

			const bounds = gridRects.reduce(
				(acc, r) => ({
					minX: Math.min(acc.minX, r.x),
					maxX: Math.max(acc.maxX, r.x + r.w),
					minY: Math.min(acc.minY, r.y),
					maxY: Math.max(acc.maxY, r.y + r.h),
				}),
				{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
			);

			// Draw verticals
			xBoundaries.forEach((x) => {
				const lx = Math.floor(x) + 0.5;
				ctx.moveTo(lx, bounds.minY);
				ctx.lineTo(lx, bounds.maxY);
			});

			// Draw horizontals
			yBoundaries.forEach((y) => {
				const ly = Math.floor(y) + 0.5;
				ctx.moveTo(bounds.minX, ly);
				ctx.lineTo(bounds.maxX, ly);
			});
		} else {
			gridRects.forEach((r) => {
				ctx.rect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
			});
		}

		ctx.stroke();
		ctx.restore();
	};

	const getYPixelBounds = (
		u: uPlot,
		bucketStarts: number[][],
		bucketEnds: number[][],
	): Array<{ y0: number; y1: number }> | null => {
		const isUniform =
			bucketStarts.length > 0 &&
			bucketEnds.length > 0 &&
			bucketStarts.every((row, idx) => idx === 0 || row === bucketStarts[0]) &&
			bucketEnds.every((row, idx) => idx === 0 || row === bucketEnds[0]);

		if (isUniform && bucketStarts[0]?.length && bucketEnds[0]?.length) {
			return bucketStarts[0].map((start, yi) => {
				const endVal = bucketEnds[0]?.[yi];
				return {
					y0: u.valToPos(start, 'y', true),
					y1: u.valToPos(endVal ?? start, 'y', true),
				};
			});
		}
		return null;
	};

	const drawHeatmapCell = (
		ctx: CanvasRenderingContext2D,
		r: { x: number; y: number; w: number; h: number },
		v: number,
		maxForScale: number,
		logDenom: number,
	): void => {
		if (Number.isFinite(v) && v > 0) {
			const normalizedIntensity = normalizeIntensity(v, maxForScale, logDenom);
			ctx.globalAlpha = 1;
			ctx.fillStyle = pickFillStyle(normalizedIntensity);
		} else {
			ctx.globalAlpha = 1;
			ctx.fillStyle = emptyColor;
		}
		ctx.fillRect(r.x, r.y, r.w, r.h);
	};

	const processHeatmapCell = (
		ctx: CanvasRenderingContext2D,
		u: uPlot,
		xi: number,
		yi: number,
		values: number[][],
		bucketStarts: number[][],
		bucketEnds: number[][],
		xLeft: number,
		xRight: number,
		yPixBounds: Array<{ y0: number; y1: number }> | null,
		maxForScale: number,
		logDenom: number,
		gridRects: Array<{ x: number; y: number; w: number; h: number }>,
	): void => {
		const v = values[xi][yi];
		const start = bucketStarts[xi][yi];
		const end = bucketEnds[xi][yi];

		if (!Number.isFinite(start) || !Number.isFinite(end)) return;

		let y0: number;
		let y1: number;
		if (yPixBounds && yPixBounds[yi]) {
			({ y0, y1 } = yPixBounds[yi]);
		} else {
			y0 = u.valToPos(start, 'y', true);
			y1 = u.valToPos(end, 'y', true);
		}

		const r = rectFromBounds(xLeft, y0, xRight, y1);
		drawHeatmapCell(ctx, r, v, maxForScale, logDenom);

		if (showGrid) {
			gridRects.push(r);
		}
	};

	const drawMetricsHeatmap = (
		u: uPlot,
		bucketStarts: number[][],
		bucketEnds: number[][],
		values: number[][],
		xVals: number[],
	): void => {
		const { ctx } = u;
		const step = getStepSize(xVals);
		const { maxForScale, logDenom } = getScale(values);

		const yPixBounds = getYPixelBounds(u, bucketStarts, bucketEnds);
		const isUniformBuckets = yPixBounds !== null;

		ctx.save();
		ctx.beginPath();
		ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
		ctx.clip();

		const gridRects: Array<{ x: number; y: number; w: number; h: number }> = [];

		xVals.forEach((_, xi) => {
			const { leftVal, rightVal } = getXValBounds(xVals, xi, step);
			const x0 = u.valToPos(leftVal, 'x', true);
			const x1 = u.valToPos(rightVal, 'x', true);
			const xLeft = Math.min(x0, x1);
			const xRight = Math.max(x0, x1);

			values[xi].forEach((_, yi) => {
				processHeatmapCell(
					ctx,
					u,
					xi,
					yi,
					values,
					bucketStarts,
					bucketEnds,
					xLeft,
					xRight,
					yPixBounds,
					maxForScale,
					logDenom,
					gridRects,
				);
			});
		});

		if (showGrid) {
			drawGridLines(ctx, gridRects, isUniformBuckets);
		}

		ctx.globalAlpha = 1;
		ctx.restore();
	};

	const calculateHoverData = (
		u: uPlot,
		idx: number,
		top: number,
	): {
		yi: number;
		count: number;
		cellRect: { x: number; y: number; w: number; h: number } | null;
	} => {
		const { data } = u;
		const yVal = u.posToVal(top, 'y');

		let nextHoveredYi = -1;
		let nextHoveredCount = 0;
		let cellRect: { x: number; y: number; w: number; h: number } | null = null;

		if (data.length >= 6) {
			const bucketStarts = (data[3] as unknown) as number[][];
			const bucketEnds = (data[4] as unknown) as number[][];
			const starts = bucketStarts[idx] || bucketStarts[0] || [];
			const ends = bucketEnds[idx] || bucketEnds[0] || [];
			const counts2d = (data[5] as unknown) as number[][];

			nextHoveredYi = getBucketIndexForY(yVal, starts, ends);
			if (nextHoveredYi >= 0) {
				if (counts2d[idx]) nextHoveredCount = counts2d[idx][nextHoveredYi] || 0;

				const xVals = (data[0] as number[]) || [];
				if (lastXValsForHover !== xVals) {
					cachedStepForHover = getStepSize(xVals);
					lastXValsForHover = xVals;
				}
				const step = cachedStepForHover || 1;

				const { leftVal, rightVal } = getXValBounds(xVals, idx, step);
				const x0 = u.valToPos(leftVal, 'x', true);
				const x1 = u.valToPos(rightVal, 'x', true);
				const xLeft = Math.min(x0, x1);
				const xRight = Math.max(x0, x1);

				const start = starts[nextHoveredYi];
				const end = ends[nextHoveredYi];
				const y0 = u.valToPos(start, 'y', true);
				const y1 = u.valToPos(end, 'y', true);

				cellRect = rectFromBounds(xLeft, y0, xRight, y1);
			}
		}

		return { yi: nextHoveredYi, count: nextHoveredCount, cellRect };
	};

	const updateHoverDisplay = (
		u: uPlot,
		cellRect: { x: number; y: number; w: number; h: number } | null,
	): void => {
		if (!hoverBox) return;

		if (cellRect) {
			const overlayOffsetX = u.over.offsetLeft - u.ctx.canvas.offsetLeft;
			const overlayOffsetY = u.over.offsetTop - u.ctx.canvas.offsetTop;

			hoverBox.style.display = 'block';
			hoverBox.style.left = `${cellRect.x - overlayOffsetX}px`;
			hoverBox.style.top = `${cellRect.y - overlayOffsetY}px`;
			hoverBox.style.width = `${cellRect.w}px`;
			hoverBox.style.height = `${cellRect.h}px`;
		} else {
			hoverBox.style.display = 'none';
		}
	};

	const notifyHoverChange = (
		left: number,
		top: number,
		idx: number,
		hoverData: {
			yi: number;
			count: number;
			cellRect: { x: number; y: number; w: number; h: number } | null;
		},
	): void => {
		if (!opts.onHover) return;

		const bbox =
			overBBox ||
			(hoverBox?.parentElement as HTMLElement)?.getBoundingClientRect();
		if (!bbox) return;

		const mouseX = bbox.left + (left || 0);
		const mouseY = bbox.top + (top || 0);

		if (hoverData.yi >= 0) {
			opts.onHover(
				{ xi: idx, yi: hoverData.yi, count: hoverData.count },
				{ x: mouseX, y: mouseY },
			);
		} else {
			opts.onHover(null, { x: mouseX, y: mouseY });
		}
	};

	const updateHoverState = (
		nextXi: number,
		hoverData: {
			yi: number;
			count: number;
			cellRect: { x: number; y: number; w: number; h: number } | null;
		},
	): void => {
		if (hoveredXi !== nextXi || hoveredYi !== hoverData.yi) {
			hoveredXi = nextXi;
			hoveredYi = hoverData.yi;
			hoveredCount = hoverData.count;
		}
	};

	return {
		hooks: {
			init: (u: uPlot): void => {
				hoverBox = document.createElement('div');
				hoverBox.style.position = 'absolute';
				hoverBox.style.boxSizing = 'border-box';
				hoverBox.style.border = `${hoverLineWidth}px solid ${hoverStroke}`;
				hoverBox.style.pointerEvents = 'none';
				hoverBox.style.display = 'none';
				hoverBox.style.zIndex = '10';
				u.over.appendChild(hoverBox);

				u.over.addEventListener('mouseenter', () => {
					overBBox = u.over.getBoundingClientRect();
				});

				u.over.addEventListener('click', () => {
					if (!opts.onClick) return;
					if (hoveredXi !== null && hoveredYi !== null && hoveredYi >= 0) {
						const bbox = overBBox || u.over.getBoundingClientRect();
						const { left } = u.cursor;
						const { top } = u.cursor;
						const mouseX = bbox.left + (left || 0);
						const mouseY = bbox.top + (top || 0);

						opts.onClick(
							{ xi: hoveredXi, yi: hoveredYi, count: hoveredCount },
							{ x: mouseX, y: mouseY },
						);
					}
				});
				u.over.addEventListener('mouseleave', () => {
					hoveredXi = null;
					hoveredYi = null;
					hoveredCount = 0;
					if (hoverBox) hoverBox.style.display = 'none';
					if (opts.onHover) {
						opts.onHover(null, { x: 0, y: 0 });
					}
				});
			},
			setCursor: (u: uPlot): void => {
				const clearHover = (): void => {
					if (opts.onHover && (hoveredXi !== null || hoveredYi !== null)) {
						opts.onHover(null, { x: 0, y: 0 });
					}
					hoveredXi = null;
					hoveredYi = null;
					hoveredCount = 0;
					if (hoverBox) hoverBox.style.display = 'none';
				};

				const { left, top, idx } = u.cursor;
				if (left == null || top == null || idx == null || idx < 0) {
					clearHover();
					return;
				}

				const hoverData = calculateHoverData(u, idx, top);
				updateHoverDisplay(u, hoverData.cellRect);
				notifyHoverChange(left, top, idx, hoverData);
				updateHoverState(idx, hoverData);
			},
			draw: (u: uPlot): void => {
				const { data } = u;

				const bucketStarts = (data[3] as unknown) as number[][];
				const bucketEnds = (data[4] as unknown) as number[][];
				const values = (data[5] as unknown) as number[][];
				const xVals = (data[0] as number[]) || [];

				drawMetricsHeatmap(u, bucketStarts, bucketEnds, values, xVals);
			},
		},
	};
}

export default heatmapPlugin;
