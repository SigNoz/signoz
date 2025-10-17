/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-duplicate-string */

import uPlot from 'uplot';

type MarkersData = { id: string | number; val: number; stroke?: string };

export function verticalMarkersPlugin({
	markersData = [],
	lineType = [5, 3],
	width = 1,
}: {
	markersData?: MarkersData[];
	lineType?: number[];
	width?: number;
} = {}): uPlot.Plugin {
	const DEFAULT_STROKE = 'rgba(0, 102, 255, 0.95)';
	let removeListeners: (() => void) | null = null;
	let tooltipEl: HTMLDivElement | null = null;
	const renderAxisMarkers = (uu: uPlot): void => {
		const axes = uu.root.querySelectorAll('.u-axis');
		const xAxis = (axes && (axes[0] as HTMLElement)) || null;
		if (!xAxis) return;

		// attach delegated hover/mouseout listeners once on the x-axis container
		if (!(xAxis as HTMLElement).dataset?.vlineHoverAttached) {
			const onMouseOver = (e: MouseEvent): void => {
				const target = e.target as HTMLElement;
				if (!target?.classList?.contains('vline-triangle-marker')) return;

				const { id } = target.dataset;
				const valStr = target.dataset.val;
				const val = valStr ? Number(valStr) : undefined;
				// const mData = markersData.find((d) => String(d.id) === String(id));
				// create tooltip
				if (!tooltipEl) {
					tooltipEl = document.createElement('div');
					tooltipEl.className = 'vline-marker-tooltip';
					Object.assign(tooltipEl.style, {
						position: 'fixed',
						padding: '6px 8px',
						borderRadius: '4px',
						fontSize: '12px',
						zIndex: '10000',
						pointerEvents: 'none',
						background: '#111827',
						color: '#e5e7eb',
						border: '1px solid #374151',
					});
					document.body.appendChild(tooltipEl);
				}
				tooltipEl.textContent = `id: ${id ?? ''} • ts: ${val ?? ''}`;
				// position near cursor
				tooltipEl.style.left = `${e.clientX + 10}px`;
				tooltipEl.style.top = `${e.clientY - 28}px`;
			};
			const onMouseOut = (e: MouseEvent): void => {
				const target = e.target as HTMLElement;
				if (!target?.classList?.contains('vline-triangle-marker')) return;
				if (tooltipEl) {
					tooltipEl.remove();
					tooltipEl = null;
				}
			};
			xAxis.addEventListener('mouseover', onMouseOver);
			xAxis.addEventListener('mouseout', onMouseOut);
			removeListeners = (): void => {
				xAxis.removeEventListener('mouseover', onMouseOver);
				xAxis.removeEventListener('mouseout', onMouseOut);
			};
			(xAxis as HTMLElement).dataset.vlineHoverAttached = '1';
		}

		// cleanup markers to avoid duplicates on rerender/resize
		xAxis.querySelectorAll('.vline-triangle-marker').forEach((el) => el.remove());

		const plotLeft = uu.bbox.left;
		const plotRight = plotLeft + uu.bbox.width;

		for (let i = 0; i < markersData.length; i++) {
			const mData = markersData[i];
			const xAbs = uu.valToPos(mData.val, 'x', true);
			if (xAbs >= plotLeft && xAbs <= plotRight) {
				const xPx = (xAbs - plotLeft) / window.devicePixelRatio;

				const marker = document.createElement('div');
				marker.className = 'vline-triangle-marker';
				marker.dataset.id = String(mData.id); // may change later after BE discussion
				marker.dataset.val = String(mData.val); // TODO: remove this later
				Object.assign(marker.style, {
					position: 'absolute',
					width: '0px',
					height: '0px',
					borderLeft: '5px solid transparent',
					borderRight: '5px solid transparent',
					borderBottomWidth: '5px',
					borderBottomStyle: 'solid',
					borderBottomColor: mData.stroke || DEFAULT_STROKE,
					transform: 'translateX(-50%)',
					cursor: 'pointer',
					zIndex: '1',
					left: `${xPx}px`,
				});

				xAxis.appendChild(marker);
			}
		}
	};

	return {
		hooks: {
			destroy: [
				(): void => {
					if (tooltipEl) {
						tooltipEl.remove();
						tooltipEl = null;
					}
					if (removeListeners) {
						removeListeners();
						removeListeners = null;
					}
				},
			],
			drawAxes: [
				(uu: uPlot): void => {
					renderAxisMarkers(uu);
				},
			],
			draw: [
				(uu: uPlot): void => {
					const { ctx } = uu;
					const { top } = uu.bbox;
					const bottom = top + uu.bbox.height;
					const plotLeft = uu.bbox.left;
					const plotRight = plotLeft + uu.bbox.width;

					ctx.save();
					for (let i = 0; i < markersData.length; i++) {
						const mData = markersData[i];
						const x = uu.valToPos(mData.val, 'x', true);
						// only draw if within plot bounds
						if (x >= plotLeft && x <= plotRight) {
							ctx.beginPath();
							ctx.strokeStyle = mData.stroke || DEFAULT_STROKE;
							ctx.lineWidth = width;
							ctx.setLineDash(lineType || []);
							ctx.moveTo(x, top);
							ctx.lineTo(x, bottom);
							ctx.stroke();
						}
					}
					ctx.restore();
				},
			],
		},
	};
}

// MOVE TO REACT
// correct the format should work with expected data from BE
// Remove cognitive complexity rule.

// add support to pass customHooks to GetUPlotChartOptions. and pass marker hooks using this
// should only pass marker hook if data is present(shouldRenderMarker memo)
// depending on type of marker parse the data to choose color. example deployment should be red etc.
// pass such data with multple colors to check render.
// PERF CHECK.

// drive data passing from the context for markers. data in this is enriched only when we
// use <ShowMarkers /> component. else it will be empty.
// plugins. and pass marker hooks using this
// should only pass marker hook if data is present(shouldRenderMarker memo)
// depending on type of marker parse the data to choose color. example deployment should be red etc.
// pass such data with multple colors to check render.
// PERF CHECK.

// drive data passing from the context for markers. data in this is enriched only when we
// use <ShowMarkers /> component. else it will be empty.
