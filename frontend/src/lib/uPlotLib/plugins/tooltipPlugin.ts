import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { themeColors } from 'constants/theme';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { get } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { placement } from '../placement';
import { generateColor } from '../utils/generateColor';

dayjs.extend(customParseFormat);

interface UplotTooltipDataProps {
	show: boolean;
	color: string;
	label: string;
	focus: boolean;
	value: number;
	tooltipValue: string;
	textContent: string;
	queryName: string;
}

function getTooltipBaseValue(
	data: any[],
	index: number,
	idx: number,
	stackBarChart: boolean | undefined,
): any {
	if (stackBarChart && index + 1 < data.length) {
		return data[index][idx] - data[index + 1][idx];
	}

	return data[index][idx];
}

function sortTooltipContentBasedOnValue(
	tooltipDataObj: Record<string, UplotTooltipDataProps>,
): Record<string, UplotTooltipDataProps> {
	const entries = Object.entries(tooltipDataObj);

	// Separate focused and non-focused entries in a single pass
	const focusedEntries: [string, UplotTooltipDataProps][] = [];
	const nonFocusedEntries: [string, UplotTooltipDataProps][] = [];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (entry[1].focus) {
			focusedEntries.push(entry);
		} else {
			nonFocusedEntries.push(entry);
		}
	}

	// Sort non-focused entries by value (descending)
	nonFocusedEntries.sort((a, b) => b[1].value - a[1].value);

	// Combine with focused entries on top
	return Object.fromEntries(focusedEntries.concat(nonFocusedEntries));
}

const generateTooltipContent = (
	seriesList: any[],
	data: any[],
	idx: number,
	isDarkMode: boolean,
	yAxisUnit?: string,
	decimalPrecision?: PrecisionOption,
	series?: uPlot.Options['series'],
	isBillingUsageGraphs?: boolean,
	isHistogramGraphs?: boolean,
	isMergedSeries?: boolean,
	stackBarChart?: boolean,
	timezone?: string,
	colorMapping?: Record<string, string>,
	query?: Query,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): HTMLElement => {
	const container = document.createElement('div');
	container.classList.add('tooltip-container');
	let tooltipCount = 0;

	let tooltipTitle = '';
	const formattedData: Record<string, UplotTooltipDataProps> = {};
	const duplicatedLegendLabels: Record<string, true> = {};

	// Pre-build a label-to-series map for O(1) lookup instead of O(n) search
	let seriesColorMap: Map<string, string> | null = null;
	if (isBillingUsageGraphs && series) {
		seriesColorMap = new Map();
		for (let i = 0; i < series.length; i++) {
			const item = series[i];
			if (item.label) {
				const fillColor = get(item, '_fill');
				if (fillColor) {
					seriesColorMap.set(item.label, fillColor);
				}
			}
		}
	}

	if (Array.isArray(series) && series.length > 0) {
		for (let index = 0; index < series.length; index++) {
			const item = series[index];

			if (index === 0) {
				if (isBillingUsageGraphs) {
					tooltipTitle = dayjs(data[0][idx] * 1000)
						.tz(timezone)
						.format(DATE_TIME_FORMATS.MONTH_YEAR);
				} else {
					tooltipTitle = dayjs(data[0][idx] * 1000)
						.tz(timezone)
						.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);
				}
			} else if (item.show) {
				const {
					metric = {},
					queryName = '',
					legend = '',
					quantity = [],
					unit = '',
				} = seriesList[index - 1] || {};

				const value = getTooltipBaseValue(data, index, idx, stackBarChart);

				const dataIngested = quantity[idx];
				const baseLabelName = getLabelName(metric, queryName || '', legend || '');

				let label = '';
				if (isMergedSeries) {
					label = '';
				} else if (query) {
					label = getLegend(seriesList[index - 1], query, baseLabelName);
				} else {
					label = baseLabelName;
				}

				let color =
					colorMapping?.[label] ||
					generateColor(
						label,
						isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
					);

				// O(1) lookup instead of O(n) search for billing graph colors
				if (isBillingUsageGraphs && seriesColorMap) {
					const billingColor = seriesColorMap.get(label);
					if (billingColor) {
						color = billingColor;
					}
				}

				let tooltipItemLabel = label;

				if (Number.isFinite(value)) {
					const tooltipValue = getToolTipValue(value, yAxisUnit, decimalPrecision);
					const dataIngestedFormated = getToolTipValue(dataIngested);
					if (duplicatedLegendLabels[label] || label in formattedData) {
						duplicatedLegendLabels[label] = true;
						const tempDataObj = formattedData[label];

						if (tempDataObj) {
							const newLabel = `${tempDataObj.queryName}: ${tempDataObj.label}`;

							tempDataObj.textContent = `${newLabel} : ${tempDataObj.tooltipValue}`;

							formattedData[newLabel] = tempDataObj;

							delete formattedData[label];
						}

						tooltipItemLabel = `${queryName}: ${label}`;
					}

					const dataObj = {
						show: item.show || false,
						color,
						label,
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						focus: item?._focus || false,
						value,
						tooltipValue,
						queryName,
						textContent: isBillingUsageGraphs
							? `${tooltipItemLabel} : $${tooltipValue} - ${dataIngestedFormated} ${unit}`
							: `${tooltipItemLabel} : ${tooltipValue}`,
					};

					tooltipCount += 1;

					formattedData[tooltipItemLabel] = dataObj;
				}
			}
		}
	}

	// Early return if no valid data points - avoids unnecessary DOM manipulation
	if (tooltipCount <= 0) {
		return container;
	}

	const sortedData: Record<
		string,
		UplotTooltipDataProps
	> = sortTooltipContentBasedOnValue(formattedData);

	const headerDiv = document.createElement('div');
	headerDiv.classList.add('tooltip-content-row', 'tooltip-content-header');
	headerDiv.textContent = isHistogramGraphs ? '' : tooltipTitle;
	container.appendChild(headerDiv);

	// Use DocumentFragment for better performance when adding multiple elements
	const fragment = document.createDocumentFragment();

	const sortedValues = Object.values(sortedData);

	for (let i = 0; i < sortedValues.length; i++) {
		const { textContent, color, focus } = sortedValues[i];

		const div = document.createElement('div');
		div.classList.add('tooltip-content-row', 'tooltip-content');

		const squareBox = document.createElement('div');
		squareBox.classList.add('pointSquare');
		squareBox.style.borderColor = color;

		const text = document.createElement('div');
		text.classList.add('tooltip-data-point');
		text.textContent = textContent;
		text.style.color = color;

		if (focus) {
			text.classList.add('focus');
		}

		div.appendChild(squareBox);
		div.appendChild(text);
		fragment.appendChild(div);
	}

	if (fragment.hasChildNodes()) {
		container.appendChild(fragment);
	}

	return container;
};

type ToolTipPluginProps = {
	apiResponse: MetricRangePayloadProps | undefined;
	yAxisUnit?: string;
	isBillingUsageGraphs?: boolean;
	isHistogramGraphs?: boolean;
	isMergedSeries?: boolean;
	decimalPrecision?: PrecisionOption;
	stackBarChart?: boolean;
	isDarkMode: boolean;
	customTooltipElement?: HTMLDivElement;
	timezone?: string;
	colorMapping?: Record<string, string>;
	query?: Query;
};

const tooltipPlugin = ({
	apiResponse,
	yAxisUnit,
	isBillingUsageGraphs,
	isHistogramGraphs,
	isMergedSeries,
	stackBarChart,
	isDarkMode,
	customTooltipElement,
	timezone,
	colorMapping,
	query,
	decimalPrecision,
}: // eslint-disable-next-line sonarjs/cognitive-complexity
ToolTipPluginProps): any => {
	let over: HTMLElement;
	let bound: HTMLElement;
	// Cache bounding box to avoid recalculating on every cursor move
	let cachedBBox: DOMRect | null = null;
	let isActive = false;
	let overlay: HTMLElement | null = null;

	// Pre-compute apiResult once
	const apiResult = apiResponse?.data?.result || [];

	// Sync bounds and cache the result
	const syncBounds = (): void => {
		if (over) {
			cachedBBox = over.getBoundingClientRect();
		}
	};

	// Create overlay once and reuse it
	const initOverlay = (): void => {
		if (!overlay) {
			overlay = document.getElementById('overlay');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.id = 'overlay';
				overlay.style.cssText = 'display: none; position: absolute;';
				document.body.appendChild(overlay);
			}
		}
	};

	const showOverlay = (): void => {
		if (overlay && overlay.style.display === 'none') {
			overlay.style.display = 'block';
		}
	};

	const hideOverlay = (): void => {
		if (overlay && overlay.style.display === 'block') {
			overlay.style.display = 'none';
		}
	};

	const plotEnter = (): void => {
		isActive = true;
		showOverlay();
	};

	const plotLeave = (): void => {
		isActive = false;
		hideOverlay();
	};

	// Cleanup function to remove event listeners
	const cleanup = (): void => {
		if (over) {
			over.removeEventListener('mouseenter', plotEnter);
			over.removeEventListener('mouseleave', plotLeave);
		}
	};

	return {
		hooks: {
			init: (u: any): void => {
				over = u?.over;
				bound = over;

				// Initialize overlay once during init
				initOverlay();

				// Initial bounds sync
				syncBounds();

				over.addEventListener('mouseenter', plotEnter);
				over.addEventListener('mouseleave', plotLeave);
			},
			setSize: (): void => {
				// Re-sync bounds when size changes
				syncBounds();
			},
			// Cache bounding box on syncRect for better performance
			syncRect: (u: any, rect: DOMRect): void => {
				cachedBBox = rect;
			},
			setCursor: (u: {
				cursor: { left: any; top: any; idx: any };
				data: any[];
				series: uPlot.Options['series'];
			}): void => {
				if (!overlay) {
					return;
				}

				const { left, top, idx } = u.cursor;

				// Early return if not active or no valid index
				if (!isActive || !Number.isInteger(idx)) {
					if (isActive) {
						// Clear tooltip content efficiently using replaceChildren
						overlay.replaceChildren();
					}
					return;
				}

				// Use cached bounding box if available
				const bbox = cachedBBox || over.getBoundingClientRect();
				const anchor = {
					left: left + bbox.left,
					top: top + bbox.top,
				};

				const content = generateTooltipContent(
					apiResult,
					u.data,
					idx,
					isDarkMode,
					yAxisUnit,
					decimalPrecision,
					u.series,
					isBillingUsageGraphs,
					isHistogramGraphs,
					isMergedSeries,
					stackBarChart,
					timezone,
					colorMapping,
					query,
				);

				// Only show tooltip if there's actual content
				if (content.children.length > 1) {
					if (customTooltipElement) {
						content.appendChild(customTooltipElement);
					}
					// Clear and set new content in one operation
					overlay.replaceChildren(content);
					placement(overlay, anchor, 'right', 'start', {
						bound,
						followCursor: { x: anchor.left, y: anchor.top, offset: 4 },
					});

					showOverlay();
				} else {
					hideOverlay();
				}
			},
			destroy: (): void => {
				// Cleanup on destroy
				cleanup();
				hideOverlay();
			},
		},
	};
};

export default tooltipPlugin;
