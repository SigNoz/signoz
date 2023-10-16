import { Chart, ChartTypeRegistry, Plugin } from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';

// utils
import { ChartEventHandler, mergeDefaultOptions } from './utils';

export const dragSelectPluginId = 'drag-select-plugin';

type ChartDragHandlers = {
	mousedown: ChartEventHandler;
	mousemove: ChartEventHandler;
	mouseup: ChartEventHandler;
	globalMouseup: () => void;
};

export type DragSelectPluginOptions = {
	color?: string;
	onSelect?: (startValueX: number, endValueX: number) => void;
};

const defaultDragSelectPluginOptions: Required<DragSelectPluginOptions> = {
	color: 'rgba(0, 0, 0, 0.5)',
	onSelect: () => {},
};

export function createDragSelectPluginOptions(
	isEnabled: boolean,
	onSelect?: (start: number, end: number) => void,
	color?: string,
): DragSelectPluginOptions | false {
	if (!isEnabled) {
		return false;
	}

	return {
		onSelect,
		color,
	};
}

function createMousedownHandler(
	chart: Chart,
	dragData: DragSelectData,
): ChartEventHandler {
	return (ev): void => {
		const { left, right } = chart.chartArea;

		let { x: startDragPositionX } = getRelativePosition(ev, chart);

		if (left > startDragPositionX) {
			startDragPositionX = left;
		}

		if (right < startDragPositionX) {
			startDragPositionX = right;
		}

		const startValuePositionX = chart.scales.x.getValueForPixel(
			startDragPositionX,
		);

		dragData.onDragStart(startDragPositionX, startValuePositionX);
	};
}

function createMousemoveHandler(
	chart: Chart,
	dragData: DragSelectData,
): ChartEventHandler {
	return (ev): void => {
		if (!dragData.isMouseDown) {
			return;
		}

		const { left, right } = chart.chartArea;

		let { x: dragPositionX } = getRelativePosition(ev, chart);

		if (left > dragPositionX) {
			dragPositionX = left;
		}

		if (right < dragPositionX) {
			dragPositionX = right;
		}

		const valuePositionX = chart.scales.x.getValueForPixel(dragPositionX);

		dragData.onDrag(dragPositionX, valuePositionX);
		chart.update('none');
	};
}

function createMouseupHandler(
	chart: Chart,
	options: DragSelectPluginOptions,
	dragData: DragSelectData,
): ChartEventHandler {
	return (ev): void => {
		const { left, right } = chart.chartArea;

		let { x: endRelativePostionX } = getRelativePosition(ev, chart);

		if (left > endRelativePostionX) {
			endRelativePostionX = left;
		}

		if (right < endRelativePostionX) {
			endRelativePostionX = right;
		}

		const endValuePositionX = chart.scales.x.getValueForPixel(
			endRelativePostionX,
		);

		dragData.onDragEnd(endRelativePostionX, endValuePositionX);

		chart.update('none');

		if (
			typeof options.onSelect === 'function' &&
			typeof dragData.startValuePositionX === 'number' &&
			typeof dragData.endValuePositionX === 'number'
		) {
			const start = Math.min(
				dragData.startValuePositionX,
				dragData.endValuePositionX,
			);
			const end = Math.max(
				dragData.startValuePositionX,
				dragData.endValuePositionX,
			);

			options.onSelect(start, end);
		}
	};
}

function createGlobalMouseupHandler(
	options: DragSelectPluginOptions,
	dragData: DragSelectData,
): () => void {
	return (): void => {
		const { isDragging, endRelativePixelPositionX, endValuePositionX } = dragData;

		if (!isDragging) {
			return;
		}

		dragData.onDragEnd(
			endRelativePixelPositionX as number,
			endValuePositionX as number,
		);

		if (
			typeof options.onSelect === 'function' &&
			typeof dragData.startValuePositionX === 'number' &&
			typeof dragData.endValuePositionX === 'number'
		) {
			const start = Math.min(
				dragData.startValuePositionX,
				dragData.endValuePositionX,
			);
			const end = Math.max(
				dragData.startValuePositionX,
				dragData.endValuePositionX,
			);

			options.onSelect(start, end);
		}
	};
}

class DragSelectData {
	public isDragging = false;

	public isMouseDown = false;

	public startRelativePixelPositionX: number | null = null;

	public startValuePositionX: number | null | undefined = null;

	public endRelativePixelPositionX: number | null = null;

	public endValuePositionX: number | null | undefined = null;

	public initialize(): void {
		this.isDragging = false;
		this.isMouseDown = false;
		this.startRelativePixelPositionX = null;
		this.startValuePositionX = null;
		this.endRelativePixelPositionX = null;
		this.endValuePositionX = null;
	}

	public onDragStart(
		startRelativePixelPositionX: number,
		startValuePositionX: number | undefined,
	): void {
		this.isDragging = false;
		this.isMouseDown = true;
		this.startRelativePixelPositionX = startRelativePixelPositionX;
		this.startValuePositionX = startValuePositionX;
		this.endRelativePixelPositionX = null;
		this.endValuePositionX = null;
	}

	public onDrag(
		endRelativePixelPositionX: number,
		endValuePositionX: number | undefined,
	): void {
		this.isDragging = true;
		this.endRelativePixelPositionX = endRelativePixelPositionX;
		this.endValuePositionX = endValuePositionX;
	}

	public onDragEnd(
		endRelativePixelPositionX: number,
		endValuePositionX: number | undefined,
	): void {
		if (!this.isDragging) {
			this.initialize();
			return;
		}

		this.isDragging = false;
		this.isMouseDown = false;
		this.endRelativePixelPositionX = endRelativePixelPositionX;
		this.endValuePositionX = endValuePositionX;
	}
}

export const createDragSelectPlugin = (): Plugin<
	keyof ChartTypeRegistry,
	DragSelectPluginOptions
> => {
	const dragData = new DragSelectData();
	let pluginOptions: Required<DragSelectPluginOptions>;

	const handlers: ChartDragHandlers = {
		mousedown: () => {},
		mousemove: () => {},
		mouseup: () => {},
		globalMouseup: () => {},
	};

	const dragSelectPlugin: Plugin<
		keyof ChartTypeRegistry,
		DragSelectPluginOptions
	> = {
		id: dragSelectPluginId,
		start: (chart: Chart, _, passedOptions) => {
			pluginOptions = mergeDefaultOptions(
				passedOptions,
				defaultDragSelectPluginOptions,
			);

			const { canvas } = chart;

			dragData.initialize();

			const mousedownHandler = createMousedownHandler(chart, dragData);
			const mousemoveHandler = createMousemoveHandler(chart, dragData);
			const mouseupHandler = createMouseupHandler(chart, pluginOptions, dragData);
			const globalMouseupHandler = createGlobalMouseupHandler(
				pluginOptions,
				dragData,
			);

			canvas.addEventListener('mousedown', mousedownHandler, { passive: true });
			canvas.addEventListener('mousemove', mousemoveHandler, { passive: true });
			canvas.addEventListener('mouseup', mouseupHandler, { passive: true });
			document.addEventListener('mouseup', globalMouseupHandler, {
				passive: true,
			});

			handlers.mousedown = mousedownHandler;
			handlers.mousemove = mousemoveHandler;
			handlers.mouseup = mouseupHandler;
			handlers.globalMouseup = globalMouseupHandler;
		},
		beforeDestroy: (chart: Chart) => {
			const { canvas } = chart;

			if (!canvas) {
				return;
			}

			canvas.removeEventListener('mousedown', handlers.mousedown);
			canvas.removeEventListener('mousemove', handlers.mousemove);
			canvas.removeEventListener('mouseup', handlers.mouseup);
			document.removeEventListener('mouseup', handlers.globalMouseup);
		},
		afterDatasetsDraw: (chart: Chart) => {
			const {
				startRelativePixelPositionX,
				endRelativePixelPositionX,
				isDragging,
			} = dragData;

			if (startRelativePixelPositionX && endRelativePixelPositionX && isDragging) {
				const left = Math.min(
					startRelativePixelPositionX,
					endRelativePixelPositionX,
				);
				const right = Math.max(
					startRelativePixelPositionX,
					endRelativePixelPositionX,
				);
				const top = chart.chartArea.top - 5;
				const bottom = chart.chartArea.bottom + 5;

				/* eslint-disable-next-line no-param-reassign */
				chart.ctx.fillStyle = pluginOptions.color;
				chart.ctx.fillRect(left, top, right - left, bottom - top);
			}
		},
	};

	return dragSelectPlugin;
};
