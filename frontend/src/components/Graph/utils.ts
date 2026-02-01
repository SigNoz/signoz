import { MutableRefObject } from 'react';
import { Chart, ChartConfiguration, ChartData, Color } from 'chart.js';
// eslint-disable-next-line import/namespace -- side-effect import that registers Chart.js date adapter
import * as chartjsAdapter from 'chartjs-adapter-date-fns';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';

import { getAxisLabelColor } from './helpers';
import {
	createDragSelectPluginOptions,
	dragSelectPluginId,
} from './Plugin/DragSelect';
import {
	createIntersectionCursorPluginOptions,
	intersectionCursorPluginId,
} from './Plugin/IntersectionCursor';
import {
	CustomChartOptions,
	DEFAULT_SIGNIFICANT_DIGITS,
	GraphOnClickHandler,
	IAxisTimeConfig,
	MAX_DECIMALS,
	PrecisionOption,
	PrecisionOptionsEnum,
	StaticLineProps,
} from './types';
import { getToolTipValue, getYAxisFormattedValue } from './yAxisConfig';

export const toggleGraph = (
	graphIndex: number,
	isVisible: boolean,
	lineChartRef: MutableRefObject<Chart | undefined>,
): void => {
	if (lineChartRef && lineChartRef.current) {
		const { type } = lineChartRef.current?.config as ChartConfiguration;
		if (type === 'pie' || type === 'doughnut') {
			lineChartRef.current?.toggleDataVisibility(graphIndex);
		} else {
			lineChartRef.current?.setDatasetVisibility(graphIndex, isVisible);
		}
		lineChartRef.current?.update();
	}
};

export const getGraphOptions = (
	animate: boolean,
	staticLine: StaticLineProps | undefined,
	title: string | undefined,
	nearestDatasetIndex: MutableRefObject<number | null>,
	yAxisUnit: string,
	onDragSelect: ((start: number, end: number) => void) | undefined,
	dragSelectColor: string | undefined,
	currentTheme: 'dark' | 'light',
	getGridColor: () => 'rgba(231,233,237,0.1)' | 'rgba(231,233,237,0.8)',
	xAxisTimeUnit: IAxisTimeConfig,
	isStacked: boolean | undefined,
	onClickHandler: GraphOnClickHandler | undefined,
	data: ChartData,
	timezone: Timezone,
	minTime?: number,
	maxTime?: number,
	// eslint-disable-next-line sonarjs/cognitive-complexity
): CustomChartOptions => ({
	animation: {
		duration: animate ? 200 : 0,
	},
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		mode: 'index',
		intersect: true,
	},
	plugins: {
		...(staticLine
			? {
					annotation: {
						annotations: [
							{
								type: 'line',
								yMin: staticLine.yMin,
								yMax: staticLine.yMax,
								borderColor: staticLine.borderColor,
								borderWidth: staticLine.borderWidth,
								label: {
									content: staticLine.lineText,
									enabled: true,
									font: {
										size: 10,
									},
									borderWidth: 0,
									position: 'start',
									backgroundColor: 'transparent',
									color: staticLine.textColor,
								},
							},
						],
					},
			  }
			: {}),
		title: {
			display: title !== undefined,
			text: title,
		},
		legend: {
			display: false,
		},
		tooltip: {
			callbacks: {
				title(context): string | string[] {
					const date = dayjs(context[0].parsed.x);
					return date
						.tz(timezone.value)
						.format(DATE_TIME_FORMATS.MONTH_DATETIME_FULL_SECONDS);
				},
				label(context): string | string[] {
					let label = context.dataset.label || '';

					if (label) {
						label += ': ';
					}
					if (context.parsed.y !== null) {
						label += getToolTipValue(context.parsed.y.toString(), yAxisUnit);
					}

					return label;
				},
				labelTextColor(labelData): Color {
					if (labelData.datasetIndex === nearestDatasetIndex.current) {
						return 'rgba(255, 255, 255, 1)';
					}

					return 'rgba(255, 255, 255, 0.75)';
				},
			},
			position: 'custom',
			itemSort(item1, item2): number {
				return item2.parsed.y - item1.parsed.y;
			},
		},
		[dragSelectPluginId]: createDragSelectPluginOptions(
			!!onDragSelect,
			onDragSelect,
			dragSelectColor,
		),
		[intersectionCursorPluginId]: createIntersectionCursorPluginOptions(
			!!onDragSelect,
			currentTheme === 'dark' ? 'white' : 'black',
		),
	},
	layout: {
		padding: 0,
	},
	scales: {
		x: {
			stacked: isStacked,
			offset: false,
			grid: {
				display: true,
				color: getGridColor(),
				drawTicks: true,
			},
			adapters: {
				date: chartjsAdapter,
			},
			time: {
				unit: xAxisTimeUnit?.unitName || 'minute',
				stepSize: xAxisTimeUnit?.stepSize || 1,
				displayFormats: {
					millisecond: DATE_TIME_FORMATS.TIME_SECONDS,
					second: DATE_TIME_FORMATS.TIME_SECONDS,
					minute: DATE_TIME_FORMATS.TIME,
					hour: DATE_TIME_FORMATS.SLASH_SHORT,
					day: DATE_TIME_FORMATS.DATE_SHORT,
					week: DATE_TIME_FORMATS.DATE_SHORT,
					month: DATE_TIME_FORMATS.YEAR_MONTH,
					year: DATE_TIME_FORMATS.YEAR_SHORT,
				},
			},
			type: 'time',
			ticks: { color: getAxisLabelColor(currentTheme) },
			...(minTime && {
				min: dayjs(minTime).tz(timezone.value).format(),
			}),
			...(maxTime && {
				max: dayjs(maxTime).tz(timezone.value).format(),
			}),
		},
		y: {
			stacked: isStacked,
			display: true,
			grid: {
				display: true,
				color: getGridColor(),
			},
			ticks: {
				color: getAxisLabelColor(currentTheme),
				// Include a dollar sign in the ticks
				callback(value): string {
					return getYAxisFormattedValue(value.toString(), yAxisUnit);
				},
			},
		},
	},
	elements: {
		line: {
			tension: 0,
			cubicInterpolationMode: 'monotone',
		},
		point: {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			hoverBackgroundColor: (ctx: any): string => {
				if (ctx?.element?.options?.borderColor) {
					return ctx.element.options.borderColor;
				}
				return 'rgba(0,0,0,0.1)';
			},
			hoverRadius: 5,
		},
	},
	onClick: (event, element, chart): void => {
		if (onClickHandler) {
			onClickHandler(event, element, chart, data);
		}
	},
	onHover: (event, _, chart): void => {
		if (event.native) {
			const interactions = chart.getElementsAtEventForMode(
				event.native,
				'nearest',
				{
					intersect: false,
				},
				true,
			);

			if (interactions[0]) {
				// eslint-disable-next-line no-param-reassign
				nearestDatasetIndex.current = interactions[0].datasetIndex;
			}
		}
	},
});

declare module 'chart.js' {
	interface TooltipPositionerMap {
		custom: TooltipPositionerFunction<ChartType>;
	}
}

/**
 * Formats a number for display, preserving leading zeros after the decimal point
 * and showing up to DEFAULT_SIGNIFICANT_DIGITS digits after the first non-zero decimal digit.
 * It avoids scientific notation and removes unnecessary trailing zeros.
 *
 * @example
 * formatDecimalWithLeadingZeros(1.2345); // "1.2345"
 * formatDecimalWithLeadingZeros(0.0012345); // "0.0012345"
 * formatDecimalWithLeadingZeros(5.0); // "5"
 *
 * @param value The number to format.
 * @returns The formatted string.
 */
export const formatDecimalWithLeadingZeros = (
	value: number,
	precision: PrecisionOption,
): string => {
	if (value === 0) {
		return '0';
	}

	// Use toLocaleString to get a full decimal representation without scientific notation.
	const numStr = value.toLocaleString('en-US', {
		useGrouping: false,
		maximumFractionDigits: 20,
	});

	const [integerPart, decimalPart = ''] = numStr.split('.');

	// If there's no decimal part, the integer part is the result.
	if (!decimalPart) {
		return integerPart;
	}

	// Find the index of the first non-zero digit in the decimal part.
	const firstNonZeroIndex = decimalPart.search(/[^0]/);

	// If the decimal part consists only of zeros, return just the integer part.
	if (firstNonZeroIndex === -1) {
		return integerPart;
	}

	// Determine the number of decimals to keep: leading zeros + up to N significant digits.
	const significantDigits =
		precision === PrecisionOptionsEnum.FULL
			? DEFAULT_SIGNIFICANT_DIGITS
			: precision;
	const decimalsToKeep = firstNonZeroIndex + (significantDigits || 0);

	// max decimals to keep should not exceed 15 decimal places to avoid floating point precision issues
	const finalDecimalsToKeep = Math.min(decimalsToKeep, MAX_DECIMALS);
	const trimmedDecimalPart = decimalPart.substring(0, finalDecimalsToKeep);

	// If precision is 0, we drop the decimal part entirely.
	if (precision === 0) {
		return integerPart;
	}

	// Remove any trailing zeros from the result to keep it clean.
	const finalDecimalPart = trimmedDecimalPart.replace(/0+$/, '');

	// Return the integer part, or the integer and decimal parts combined.
	return finalDecimalPart ? `${integerPart}.${finalDecimalPart}` : integerPart;
};
