import uPlot from 'uplot';

export function verticalMarkersPlugin({
	xData = [],
	stroke = 'rgba(0, 102, 255, 0.95)',
	lineType = [5, 3],
	width = 1,
}: {
	xData?: number[];
	stroke?: string;
	lineType?: number[];
	width?: number;
} = {}): uPlot.Plugin {
	const renderAxisMarkers = (uu: uPlot): void => {
		const axes = uu.root.querySelectorAll('.u-axis');
		const xAxis = (axes && (axes[0] as HTMLElement)) || null;
		if (!xAxis) return;

		// cleanup markers to avoid duplicates on rerender/resize
		xAxis.querySelectorAll('.vline-triangle-marker').forEach((el) => el.remove());

		const plotLeft = uu.bbox.left;
		const plotRight = plotLeft + uu.bbox.width;

		for (let i = 0; i < xData.length; i++) {
			const ts = xData[i];
			const xAbs = uu.valToPos(ts, 'x', true);
			if (xAbs >= plotLeft && xAbs <= plotRight) {
				const xPx = (xAbs - plotLeft) / window.devicePixelRatio;

				const marker = document.createElement('div');
				marker.className = 'vline-triangle-marker';
				Object.assign(marker.style, {
					position: 'absolute',
					width: '0px',
					height: '0px',
					borderLeft: '5px solid transparent',
					borderRight: '5px solid transparent',
					borderBottomWidth: '5px',
					borderBottomStyle: 'solid',
					borderBottomColor: stroke,
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
					for (let i = 0; i < xData.length; i++) {
						const ts = xData[i];
						const x = uu.valToPos(ts, 'x', true);
						// only draw if within plot bounds
						if (x >= plotLeft && x <= plotRight) {
							ctx.beginPath();
							ctx.strokeStyle = stroke;
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

// Add tooltip support. handle remove from dom
// correct the format should work with expected data from BE
// add support to pass customHooks to GetUPlotChartOptions. and pass marker hooks using this
// should only pass marker hook if data is present(shouldRenderMarker memo)
// depending on type of marker parse the data to choose color. example deployment should be red etc.
// pass such data with multple colors to check render.
// PERF CHECK.

// drive data passing from the context for markers. data in this is enriched only when we
// use <ShowMarkers /> component. else it will be empty.
