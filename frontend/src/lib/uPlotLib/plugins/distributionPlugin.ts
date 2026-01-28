import uPlot from 'uplot';

type DistributionPluginOptions = {
	barColor?: string;
	showGrid?: boolean;
	gridColor?: string;
	gridLineWidth?: number;
	hoverStroke?: string;
	hoverLineWidth?: number;
	emptyColor?: string;
	onHover?: (
		hoverData: { bucketIndex: number; count: number; label: string } | null,
		mousePos: { x: number; y: number },
	) => void;
	onClick?: (
		data: { bucketIndex: number; count: number; label: string } | null,
		mousePos: { x: number; y: number },
	) => void;
};

function distributionPlugin(
	opts: DistributionPluginOptions = {},
): uPlot.Plugin {
	const showGrid = opts.showGrid ?? true;
	const barColor = opts.barColor || 'rgba(87, 148, 242, 0.8)';
	const hoverStroke = opts.hoverStroke || 'rgba(255,255,255,0.85)';
	const hoverLineWidth = opts.hoverLineWidth ?? 2;

	let hoverBox: HTMLDivElement | null = null;
	let overBBox: DOMRect | null = null;
	let hoveredIndex: number | null = null;

	const resetHoverState = (): void => {
		hoveredIndex = null;
		if (hoverBox) {
			hoverBox.style.display = 'none';
		}
		if (opts.onHover) {
			opts.onHover(null, { x: 0, y: 0 });
		}
	};

	const updateHoverState = (
		u: uPlot,
		bucketIndex: number,
		count: number,
		barWidth: number,
		left: number,
		top: number,
	): void => {
		hoveredIndex = bucketIndex;

		if (hoverBox) {
			const x = bucketIndex * barWidth;
			hoverBox.style.display = 'block';
			hoverBox.style.left = `${x}px`;
			hoverBox.style.top = '0px';
			hoverBox.style.width = `${barWidth}px`;
			hoverBox.style.height = '100%';
		}

		if (opts.onHover) {
			const bbox = overBBox || u.over.getBoundingClientRect();
			opts.onHover(
				{
					bucketIndex,
					count,
					label: `Bucket ${bucketIndex}`,
				},
				{ x: bbox.left + left, y: bbox.top + top },
			);
		}
	};

	const drawDistributionBars = (u: uPlot, counts: number[]): void => {
		const { ctx } = u;
		const numBuckets = counts.length;
		if (numBuckets === 0) {
			return;
		}

		const plotWidth = u.bbox.width;
		const barWidth = Math.max(1, plotWidth / numBuckets - 2);
		const barGap = 2;

		const yMin = u.scales.y.min ?? 0;
		const yBaseline = u.valToPos(yMin, 'y', true);

		ctx.save();
		ctx.beginPath();
		ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
		ctx.clip();

		counts.forEach((count, index) => {
			const x = u.bbox.left + index * (barWidth + barGap);

			if (u.scales.y.log && count <= 0) {
				return;
			}

			const yPos = u.valToPos(count, 'y', true);
			const y = yPos;
			const barHeight = yBaseline - yPos;

			if (barHeight > 0) {
				ctx.fillStyle = barColor;
				ctx.fillRect(x, y, Math.max(1, barWidth), barHeight);

				if (showGrid) {
					ctx.strokeStyle = opts.gridColor || 'rgba(0, 0, 0, 0.5)';
					ctx.lineWidth = opts.gridLineWidth ?? 0.5;
					ctx.strokeRect(x, y, Math.max(1, barWidth), barHeight);
				}
			}
		});

		ctx.restore();
	};

	const getBucketIndexFromX = (
		x: number,
		numBuckets: number,
		plotLeft: number,
		plotWidth: number,
	): number => {
		if (numBuckets === 0) {
			return -1;
		}
		const barWidth = plotWidth / numBuckets;
		const relativeX = x - plotLeft;
		const index = Math.floor(relativeX / barWidth);
		if (index >= 0 && index < numBuckets) {
			return index;
		}
		return -1;
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

				u.over.addEventListener('click', (e: MouseEvent) => {
					if (!opts.onClick) {
						return;
					}
					const rect = u.over.getBoundingClientRect();
					const mouseX = e.clientX - rect.left;
					const { data } = u;

					if (data.length >= 2) {
						const counts = (data[1] as number[]) || [];
						const numBuckets = counts.length;
						const plotLeft = 0;
						const plotWidth = rect.width;
						const bucketIndex = getBucketIndexFromX(
							mouseX,
							numBuckets,
							plotLeft,
							plotWidth,
						);

						if (bucketIndex >= 0) {
							const count = counts[bucketIndex] || 0;
							opts.onClick(
								{
									bucketIndex,
									count,
									label: `Bucket ${bucketIndex}`,
								},
								{ x: e.clientX, y: e.clientY },
							);
						}
					}
				});

				u.over.addEventListener('mouseleave', () => {
					resetHoverState();
				});
			},
			setCursor: (u: uPlot): void => {
				const { top, left } = u.cursor;

				if (top == null || left == null) {
					resetHoverState();
					return;
				}

				const { data } = u;
				if (data.length < 2) {
					return;
				}

				const counts = (data[1] as number[]) || [];
				const numBuckets = counts.length;
				const plotWidth = u.bbox.width;
				const barWidth = plotWidth / numBuckets;

				const bucketIndex = getBucketIndexFromX(left, numBuckets, 0, plotWidth);

				if (bucketIndex >= 0 && bucketIndex !== hoveredIndex) {
					updateHoverState(
						u,
						bucketIndex,
						counts[bucketIndex] || 0,
						barWidth,
						left,
						top,
					);
				} else if (bucketIndex < 0) {
					resetHoverState();
				}
			},
			draw: (u: uPlot): void => {
				const { data } = u;

				if (data.length < 2) {
					return;
				}

				const counts = (data[1] as number[]) || [];

				drawDistributionBars(u, counts);
			},
		},
	};
}

export default distributionPlugin;
