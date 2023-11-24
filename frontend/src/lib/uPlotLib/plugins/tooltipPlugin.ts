import { getToolTipValue } from 'components/Graph/yAxisConfig';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import getLabelName from 'lib/getLabelName';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { colors } from '../../getRandomColor';
import { placement } from '../placement';

dayjs.extend(customParseFormat);

interface UplotTooltipDataProps {
	show: boolean;
	color: string;
	label: string;
	focus: boolean;
	value: string | number;
	tooltipValue: string;
	textContent: string;
}

const generateTooltipContent = (
	seriesList: any[],
	data: any[],
	idx: number,
	yAxisUnit?: string,
	series?: uPlot.Options['series'],
	fillSpans?: boolean,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): HTMLElement => {
	const container = document.createElement('div');
	container.classList.add('tooltip-container');

	let tooltipTitle = '';
	const formattedData: Record<string, UplotTooltipDataProps> = {};

	if (Array.isArray(series) && series.length > 0) {
		series.forEach((item, index) => {
			if (index === 0) {
				tooltipTitle = dayjs(data[0][idx] * 1000).format('MMM DD YYYY HH:mm:ss');
			} else if (fillSpans ? item.show : item.show && data[index][idx]) {
				const { metric = {}, queryName = '', legend = '' } =
					seriesList[index - 1] || {};

				const label = getLabelName(
					metric,
					queryName || '', // query
					legend || '',
				);

				const value = data[index][idx] || 0;
				const tooltipValue = getToolTipValue(value, yAxisUnit);

				const dataObj = {
					show: item.show || false,
					color: colors[(index - 1) % colors.length],
					label,
					focus: item._focus || false,
					value,
					tooltipValue,
					textContent: `${label} : ${tooltipValue || 0}`,
				};

				formattedData[value] = dataObj;
			}
		});
	}

	// Get the keys and sort them
	const sortedKeys = Object.keys(formattedData).sort((a, b) => b - a);

	// Create a new object with sorted keys
	const sortedData: Record<string, UplotTooltipDataProps> = {};
	sortedKeys.forEach((key) => {
		sortedData[key] = formattedData[key];
	});

	const div = document.createElement('div');
	div.classList.add('tooltip-content-row');
	div.textContent = tooltipTitle;
	div.classList.add('tooltip-content-header');
	container.appendChild(div);

	if (Array.isArray(sortedKeys) && sortedKeys.length > 0) {
		sortedKeys.forEach((key) => {
			if (sortedData[key]) {
				const { textContent, color, focus } = sortedData[key];
				const div = document.createElement('div');
				div.classList.add('tooltip-content-row');
				div.classList.add('tooltip-content');
				const squareBox = document.createElement('div');
				squareBox.classList.add('pointSquare');

				squareBox.style.borderColor = color;

				const text = document.createElement('div');
				text.classList.add('tooltip-data-point');

				text.textContent = textContent;
				text.style.color = color;

				if (focus) {
					text.classList.add('focus');
				} else {
					text.classList.remove('focus');
				}

				div.appendChild(squareBox);
				div.appendChild(text);

				container.appendChild(div);
			}
		});
	}

	const overlay = document.getElementById('overlay');

	if (overlay && overlay.style.display === 'none') {
		overlay.style.display = 'block';
	}

	return container;
};

const tooltipPlugin = (
	apiResponse: MetricRangePayloadProps | undefined,
	yAxisUnit?: string,
	fillSpans?: boolean,
): any => {
	let over: HTMLElement;
	let bound: HTMLElement;
	let bLeft: any;
	let bTop: any;

	const syncBounds = (): void => {
		const bbox = over.getBoundingClientRect();
		bLeft = bbox.left;
		bTop = bbox.top;
	};

	let overlay = document.getElementById('overlay');

	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'overlay';
		overlay.style.display = 'none';
		overlay.style.position = 'absolute';
		document.body.appendChild(overlay);
	}

	const apiResult = apiResponse?.data?.result || [];

	return {
		hooks: {
			init: (u: any): void => {
				over = u?.over;
				bound = over;
				over.onmouseenter = (): void => {
					if (overlay) {
						overlay.style.display = 'block';
					}
				};
				over.onmouseleave = (): void => {
					if (overlay) {
						overlay.style.display = 'none';
					}
				};
			},
			setSize: (): void => {
				syncBounds();
			},
			setCursor: (u: {
				cursor: { left: any; top: any; idx: any };
				data: any[];
				series: uPlot.Options['series'];
			}): void => {
				if (overlay) {
					overlay.textContent = '';
					const { left, top, idx } = u.cursor;
					if (idx) {
						const anchor = { left: left + bLeft, top: top + bTop };
						const content = generateTooltipContent(
							apiResult,
							u.data,
							idx,
							yAxisUnit,
							u.series,
							fillSpans,
						);
						overlay.appendChild(content);
						placement(overlay, anchor, 'right', 'start', { bound });
					}
				}
			},
		},
	};
};

export default tooltipPlugin;
