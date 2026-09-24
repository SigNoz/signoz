import { Color } from '@signozhq/design-tokens';
import uPlot from 'uplot';

import { HeatmapYAxis } from './types';

const HIGHLIGHT_BORDER_WIDTH = 1;
/** ~55% alpha. */
const DIM_ALPHA = '8C';

export interface HeatmapHoverOverlay {
	container: HTMLDivElement;
	highlight: HTMLDivElement;
	/** Four corner rects whose complement is the hovered row/column cross. */
	dims: HTMLDivElement[];
}

function createOverlayElement(): HTMLDivElement {
	const element = document.createElement('div');
	element.style.position = 'absolute';
	element.style.pointerEvents = 'none';
	return element;
}

function setRect(
	element: HTMLDivElement,
	left: number,
	top: number,
	width: number,
	height: number,
): void {
	element.style.left = `${left}px`;
	element.style.top = `${top}px`;
	element.style.width = `${Math.max(0, width)}px`;
	element.style.height = `${Math.max(0, height)}px`;
}

/** Kept out of the canvas so moving between cells repositions a few nodes
 *  instead of repainting the grid. */
export function createHoverOverlay(isDarkMode: boolean): HeatmapHoverOverlay {
	const container = createOverlayElement();
	container.style.inset = '0';
	container.style.display = 'none';
	container.setAttribute('data-testid', 'heatmap-hover-overlay');

	const dimColor = `${
		isDarkMode ? Color.BG_INK_500 : Color.BG_VANILLA_100
	}${DIM_ALPHA}`;
	const dims = Array.from({ length: 4 }, () => {
		const dim = createOverlayElement();
		dim.style.background = dimColor;
		container.appendChild(dim);
		return dim;
	});

	const highlight = createOverlayElement();
	highlight.style.border = `${HIGHLIGHT_BORDER_WIDTH}px solid ${
		isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_300
	}`;
	highlight.style.boxSizing = 'border-box';
	container.appendChild(highlight);

	return { container, highlight, dims };
}

/** Positions the highlight, and the four corner rects so only the hovered row
 *  and column stay at full contrast. */
export function showHoverOverlay({
	overlay,
	u,
	yAxis,
	step,
	row,
	column,
	dim,
}: {
	overlay: HeatmapHoverOverlay;
	u: uPlot;
	yAxis: HeatmapYAxis;
	step: number;
	row: number;
	column: number;
	dim: boolean;
}): void {
	const timestamps = u.data[0] as ArrayLike<number>;
	const width = u.over.clientWidth;
	const height = u.over.clientHeight;

	const cellLeft = u.valToPos(timestamps[column], 'x');
	const cellRight = u.valToPos(timestamps[column] + step, 'x');
	const cellTop = u.valToPos(yAxis.edges[row + 1], 'y');
	const cellBottom = u.valToPos(yAxis.edges[row], 'y');

	setRect(
		overlay.highlight,
		cellLeft,
		cellTop,
		cellRight - cellLeft,
		cellBottom - cellTop,
	);

	const [topLeft, topRight, bottomLeft, bottomRight] = overlay.dims;
	if (dim) {
		setRect(topLeft, 0, 0, cellLeft, cellTop);
		setRect(topRight, cellRight, 0, width - cellRight, cellTop);
		setRect(bottomLeft, 0, cellBottom, cellLeft, height - cellBottom);
		setRect(
			bottomRight,
			cellRight,
			cellBottom,
			width - cellRight,
			height - cellBottom,
		);
	} else {
		overlay.dims.forEach((element) => setRect(element, 0, 0, 0, 0));
	}

	overlay.container.style.display = 'block';
}
