import {
	ActiveElement,
	ChartTypeRegistry,
	Point,
	TooltipModel,
	TooltipXAlignment,
	TooltipYAlignment,
} from 'chart.js';

export function TooltipPosition(
	this: TooltipModel<keyof ChartTypeRegistry>,
	_: readonly ActiveElement[],
	eventPosition: Point,
): ITooltipPosition {
	const {
		chartArea: { width },
		scales: { x, y },
	} = this.chart;

	const valueForPixelOnX = Number(x.getValueForPixel(eventPosition.x));
	const valueForPixelonY = Number(y.getValueForPixel(eventPosition.y));

	const rightmostWidth = this.width + x.getPixelForValue(valueForPixelOnX) + 20;

	if (rightmostWidth > width) {
		return {
			x: x.getPixelForValue(valueForPixelOnX) - 20,
			y: y.getPixelForValue(valueForPixelonY) + 10,
			xAlign: 'right',
			yAlign: 'top',
		};
	}
	return {
		x: x.getPixelForValue(valueForPixelOnX) + 20,
		y: y.getPixelForValue(valueForPixelonY) + 10,
		xAlign: 'left',
		yAlign: 'top',
	};
}

interface ITooltipPosition {
	x: number;
	y: number;
	xAlign: TooltipXAlignment;
	yAlign: TooltipYAlignment;
}
