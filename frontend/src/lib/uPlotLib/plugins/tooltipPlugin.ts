import { getToolTipValue } from 'components/Graph/yAxisConfig';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import getLabelName from 'lib/getLabelName';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { colors } from '../../getRandomColor';
import { placement } from '../placement';

dayjs.extend(customParseFormat);

const createDivsFromArray = (
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

	if (Array.isArray(series) && series.length > 0) {
		series.forEach((item, index) => {
			const div = document.createElement('div');
			div.classList.add('tooltip-content-row');

			if (index === 0) {
				const formattedDate = dayjs(data[0][idx] * 1000).format(
					'MMM DD YYYY HH:mm:ss',
				);

				div.textContent = formattedDate;
				div.classList.add('tooltip-content-header');
			} else if (fillSpans ? item.show : item.show && data[index][idx]) {
				div.classList.add('tooltip-content');
				const color = colors[(index - 1) % colors.length];

				const squareBox = document.createElement('div');
				squareBox.classList.add('pointSquare');

				squareBox.style.borderColor = color;

				const text = document.createElement('div');
				text.classList.add('tooltip-data-point');

				const { metric = {}, queryName = '', legend = '' } =
					seriesList[index - 1] || {};

				const label = getLabelName(
					metric,
					queryName || '', // query
					legend || '',
				);

				const value = data[index][idx] || 0;

				const tooltipValue = getToolTipValue(value, yAxisUnit);

				text.textContent = `${label} : ${tooltipValue || 0}`;
				text.style.color = color;

				div.appendChild(squareBox);
				div.appendChild(text);
			}

			container.appendChild(div);
		});
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
						const content = createDivsFromArray(
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
