import { Chart, ChartEvent, ChartTypeRegistry, Plugin } from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';

// utils
import { ChartEventHandler, mergeDefaultOptions } from './utils';

export const intersectionCursorPluginId = 'intersection-cursor-plugin';

export type IntersectionCursorPluginOptions = {
	color?: string;
	dashSize?: number;
	gapSize?: number;
};

export const defaultIntersectionCursorPluginOptions: Required<IntersectionCursorPluginOptions> = {
	color: 'white',
	dashSize: 3,
	gapSize: 3,
};

export function createIntersectionCursorPluginOptions(
	isEnabled: boolean,
	color?: string,
	dashSize?: number,
	gapSize?: number,
): IntersectionCursorPluginOptions | false {
	if (!isEnabled) {
		return false;
	}

	return {
		color,
		dashSize,
		gapSize,
	};
}

function createMousemoveHandler(
	chart: Chart,
	cursorData: IntersectionCursorData,
): ChartEventHandler {
	return (ev: ChartEvent | MouseEvent): void => {
		const { left, right, top, bottom } = chart.chartArea;

		let { x, y } = getRelativePosition(ev, chart);

		if (left > x) {
			x = left;
		}

		if (right < x) {
			x = right;
		}

		if (y < top) {
			y = top;
		}

		if (y > bottom) {
			y = bottom;
		}

		cursorData.onMouseMove(x, y);
	};
}

function createMouseoutHandler(
	cursorData: IntersectionCursorData,
): ChartEventHandler {
	return (): void => {
		cursorData.onMouseOut();
	};
}

class IntersectionCursorData {
	public positionX: number | null | undefined;

	public positionY: number | null | undefined;

	public initialize(): void {
		this.positionX = null;
		this.positionY = null;
	}

	public onMouseMove(x: number | undefined, y: number | undefined): void {
		this.positionX = x;
		this.positionY = y;
	}

	public onMouseOut(): void {
		this.positionX = null;
		this.positionY = null;
	}
}

export const createIntersectionCursorPlugin = (): Plugin<
	keyof ChartTypeRegistry,
	IntersectionCursorPluginOptions
> => {
	const cursorData = new IntersectionCursorData();
	let pluginOptions: Required<IntersectionCursorPluginOptions>;

	let mousemoveHandler: (ev: ChartEvent | MouseEvent) => void;
	let mouseoutHandler: (ev: ChartEvent | MouseEvent) => void;

	const intersectionCursorPlugin: Plugin<
		keyof ChartTypeRegistry,
		IntersectionCursorPluginOptions
	> = {
		id: intersectionCursorPluginId,
		start: (chart: Chart, _, passedOptions) => {
			const { canvas } = chart;

			cursorData.initialize();
			pluginOptions = mergeDefaultOptions(
				passedOptions,
				defaultIntersectionCursorPluginOptions,
			);

			mousemoveHandler = createMousemoveHandler(chart, cursorData);
			mouseoutHandler = createMouseoutHandler(cursorData);

			canvas.addEventListener('mousemove', mousemoveHandler, { passive: true });
			canvas.addEventListener('mouseout', mouseoutHandler, { passive: true });
		},
		beforeDestroy: (chart: Chart) => {
			const { canvas } = chart;

			if (!canvas) {
				return;
			}

			canvas.removeEventListener('mousemove', mousemoveHandler);
			canvas.removeEventListener('mouseout', mouseoutHandler);
		},
		afterDatasetsDraw: (chart: Chart) => {
			const { positionX, positionY } = cursorData;

			const lineDashData = [pluginOptions.dashSize, pluginOptions.gapSize];

			if (typeof positionX === 'number' && typeof positionY === 'number') {
				const { top, bottom, left, right } = chart.chartArea;

				chart.ctx.beginPath();
				/* eslint-disable-next-line no-param-reassign */
				chart.ctx.strokeStyle = pluginOptions.color;
				chart.ctx.setLineDash(lineDashData);
				chart.ctx.moveTo(left, positionY);
				chart.ctx.lineTo(right, positionY);
				chart.ctx.stroke();

				chart.ctx.beginPath();
				chart.ctx.setLineDash(lineDashData);
				/* eslint-disable-next-line no-param-reassign */
				chart.ctx.strokeStyle = pluginOptions.color;
				chart.ctx.moveTo(positionX, top);
				chart.ctx.lineTo(positionX, bottom);
				chart.ctx.stroke();
			}
		},
	};

	return intersectionCursorPlugin;
};
