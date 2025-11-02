/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable sonarjs/cognitive-complexity */
import './uPlotLib.styles.scss';

import { PANEL_TYPES } from 'constants/queryBuilder';
import { FullViewProps } from 'container/GridCardLayout/GridCard/FullView/types';
import { saveLegendEntriesToLocalStorage } from 'container/GridCardLayout/GridCard/FullView/utils';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import {
	applyEnhancedLegendStyling,
	calculateEnhancedLegendConfig,
} from 'container/PanelWrapper/enhancedLegend';
import { Dimensions } from 'hooks/useDimensions';
import { getLegend } from 'lib/dashboard/getQueryResults';
import { convertValue } from 'lib/getConvertedValue';
import getLabelName from 'lib/getLabelName';
import { cloneDeep, isUndefined } from 'lodash-es';
import _noop from 'lodash-es/noop';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import onClickPlugin, { OnClickPluginOpts } from './plugins/onClickPlugin';
import tooltipPlugin from './plugins/tooltipPlugin';
import getAxes from './utils/getAxes';
import getSeries from './utils/getSeriesData';
import { getXAxisScale } from './utils/getXAxisScale';
import { getYAxisScale } from './utils/getYAxisScale';

// Extended uPlot interface with custom properties
interface ExtendedUPlot extends uPlot {
	_legendScrollCleanup?: () => void;
	_tooltipCleanup?: () => void;
	_legendElementCleanup?: Array<() => void>;
}

export interface GetUPlotChartOptions {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	panelType?: PANEL_TYPES;
	onDragSelect?: (startTime: number, endTime: number) => void;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	onClickHandler?: OnClickPluginOpts['onClick'];
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates?: FullViewProps['setGraphsVisibilityStates'];
	thresholds?: ThresholdProps[];
	thresholdValue?: number;
	thresholdText?: string;
	fillSpans?: boolean;
	minTimeScale?: number;
	maxTimeScale?: number;
	softMin: number | null;
	softMax: number | null;
	currentQuery?: Query;
	stackBarChart?: boolean;
	hiddenGraph?: {
		[key: string]: boolean;
	};
	setHiddenGraph?: Dispatch<
		SetStateAction<{
			[key: string]: boolean;
		}>
	>;
	customTooltipElement?: HTMLDivElement;
	verticalLineTimestamp?: number;
	tzDate?: (timestamp: number) => Date;
	timezone?: string;
	customSeries?: (data: QueryData[]) => uPlot.Series[];
	isLogScale?: boolean;
	colorMapping?: Record<string, string>;
	enhancedLegend?: boolean;
	legendPosition?: LegendPosition;
	enableZoom?: boolean;
	query?: Query;
	legendScrollPosition?: {
		scrollTop: number;
		scrollLeft: number;
	};
	setLegendScrollPosition?: (position: {
		scrollTop: number;
		scrollLeft: number;
	}) => void;
}

/** the function converts series A , series B , series C to
 *  series A , series A + series B , series A + series B + series C
 *  which helps us to always ensure the bar in the front is always
 *  of the smallest value.
 */

function getStackedSeries(apiResponse: QueryData[]): QueryData[] {
	const series = cloneDeep(apiResponse);

	if (!series) {
		return series;
	}

	for (let i = series.length - 2; i >= 0; i--) {
		const { values } = series[i];
		for (let j = 0; j < values.length; j++) {
			values[j][1] = String(
				parseFloat(values[j]?.[1] || '0') +
					parseFloat(series[i + 1].values[j]?.[1] || '0'),
			);
		}

		series[i].values = values;
	}

	return series;
}

/** this does the exact same operations as the function above for a different
 *  response format.
 */
function getStackedSeriesQueryFormat(apiResponse: QueryData[]): QueryData[] {
	const series = cloneDeep(apiResponse);
	if (!series) {
		return apiResponse;
	}

	for (let i = series.length - 2; i >= 0; i--) {
		const { values } = series[i];
		for (let j = 0; j < values.length; j++) {
			values[j].value = String(
				parseFloat(values[j]?.value || '0') +
					parseFloat(series[i + 1].values[j]?.value || '0'),
			);
		}

		series[i].values = values;
	}

	return series;
}

function getStackedSeriesYAxis(apiResponse: QueryDataV3[]): QueryDataV3[] {
	const series = cloneDeep(apiResponse);
	if (!series) {
		return apiResponse;
	}

	for (let i = 0; i < series.length; i++) {
		series[i].series = getStackedSeriesQueryFormat(series[i].series || []);
	}

	return series;
}

/**
 * here we define the different series bands which should get highlighted based
 * on cursor hover. basically the to and the from destination of a particular band.
 */
function getBands(series): any[] {
	const bands = [];
	for (let i = 0; i < series.length; i++) {
		bands.push({
			series: [i === 0 ? -1 : i, i + 1],
		});
	}
	return bands;
}

function getMinMaxValues(series: QueryData[]): [number, number] {
	let min = Number.MAX_VALUE;
	let max = Number.MIN_VALUE;

	series.forEach((s) => {
		s.values?.forEach(([, val]) => {
			const num = Number(val);
			if (Number.isFinite(num) && num > 0) {
				min = Math.min(min, num);
				max = Math.max(max, num);
			}
		});
	});

	return [min, max];
}

export const getUPlotChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	apiResponse,
	onDragSelect,
	yAxisUnit,
	decimalPrecision,
	minTimeScale,
	maxTimeScale,
	onClickHandler = _noop,
	graphsVisibilityStates,
	setGraphsVisibilityStates,
	thresholds,
	softMax,
	softMin,
	panelType,
	currentQuery,
	stackBarChart: stackChart,
	hiddenGraph,
	setHiddenGraph,
	customTooltipElement,
	verticalLineTimestamp,
	tzDate,
	timezone,
	customSeries,
	isLogScale,
	colorMapping,
	enhancedLegend = true,
	legendPosition = LegendPosition.BOTTOM,
	enableZoom,
	query,
	legendScrollPosition,
	setLegendScrollPosition,
}: GetUPlotChartOptions): uPlot.Options => {
	const timeScaleProps = getXAxisScale(minTimeScale, maxTimeScale);

	const stackBarChart = stackChart && isUndefined(hiddenGraph);

	const isAnomalyRule =
		apiResponse?.data?.newResult?.data?.result[0]?.isAnomaly || false;

	const series = getStackedSeries(apiResponse?.data?.result || []);

	const bands = stackBarChart ? getBands(series) : null;

	// Calculate dynamic legend configuration based on panel dimensions and series count
	const seriesCount = (apiResponse?.data?.result || []).length;

	const seriesLabels = enhancedLegend
		? (apiResponse?.data?.result || []).map((item) =>
				getLegend(
					item,
					query || currentQuery,
					getLabelName(item.metric || {}, item.queryName || '', item.legend || ''),
				),
		  )
		: [];

	const legendConfig = enhancedLegend
		? calculateEnhancedLegendConfig(
				dimensions,
				seriesCount,
				seriesLabels,
				legendPosition,
		  )
		: {
				calculatedHeight: 30,
				minHeight: 30,
				maxHeight: 30,
				itemsPerRow: 3,
				showScrollbar: false,
		  };

	// Calculate chart dimensions based on legend position
	const chartWidth =
		legendPosition === LegendPosition.RIGHT && legendConfig.calculatedWidth
			? dimensions.width - legendConfig.calculatedWidth - 10
			: dimensions.width;
	const chartHeight =
		legendPosition === LegendPosition.BOTTOM
			? dimensions.height - legendConfig.calculatedHeight - 10
			: dimensions.height;

	return {
		id,
		width: chartWidth,
		height: chartHeight,
		legend: {
			show: true,
			live: false,
			isolate: true,
		},
		focus: {
			alpha: 0.3,
		},
		cursor: {
			lock: false,
			focus: {
				prox: 1e6,
				bias: 1,
			},
			points: {
				size: (u, seriesIdx): number => u.series[seriesIdx].points.size * 3,
				width: (u, seriesIdx, size): number => size / 4,
				stroke: (u, seriesIdx): string =>
					`${u.series[seriesIdx].points.stroke(u, seriesIdx)}90`,
				fill: (): string => '#fff',
			},
			...(enableZoom
				? {
						drag: {
							x: true,
							y: true,
						},
						focus: {
							prox: 30,
						},
				  }
				: {}),
		},
		...(enableZoom
			? {
					select: {
						show: true,
					},
			  }
			: {}),
		tzDate,
		padding: [16, 16, 8, 8],
		bands,
		scales: {
			x: {
				spanGaps: true,
				...timeScaleProps,
			},
			y: {
				...(((): { auto?: boolean; range?: uPlot.Scale.Range; distr?: number } => {
					const yAxisConfig = getYAxisScale({
						thresholds,
						series: stackBarChart
							? getStackedSeriesYAxis(apiResponse?.data?.newResult?.data?.result || [])
							: apiResponse?.data?.newResult?.data?.result || [],
						yAxisUnit,
						softMax,
						softMin,
					});

					if (isLogScale) {
						const [minVal, maxVal] = getMinMaxValues(apiResponse?.data?.result || []);
						// Round down min to nearest power of 10 below the data
						const minPow = Math.floor(Math.log10(minVal));
						// Round up max to nearest power of 10 above the data
						const maxPow = Math.ceil(Math.log10(maxVal));

						return {
							range: [10 ** minPow, 10 ** maxPow],
							distr: 3, // log distribution
						};
					}

					return yAxisConfig;
				})() as { auto?: boolean; range?: uPlot.Scale.Range; distr?: number }),
			},
		},
		plugins: [
			tooltipPlugin({
				apiResponse,
				yAxisUnit,
				isDarkMode,
				stackBarChart,
				timezone,
				colorMapping,
				customTooltipElement,
				query: query || currentQuery,
				decimalPrecision,
			}),
			onClickPlugin({
				onClick: onClickHandler,
				apiResponse,
			}),
			{
				hooks: {
					draw: [
						(u): void => {
							if (verticalLineTimestamp) {
								const { ctx } = u;
								ctx.save();
								ctx.setLineDash([4, 2]);
								ctx.strokeStyle = 'white';
								ctx.lineWidth = 1;
								const x = u.valToPos(verticalLineTimestamp, 'x', true);

								ctx.beginPath();
								ctx.moveTo(x, u.bbox.top);
								ctx.lineTo(x, u.bbox.top + u.bbox.height);
								ctx.stroke();
								ctx.setLineDash([]);
								ctx.restore();
							}
						},
					],
				},
			},
		],
		hooks: {
			draw: [
				(u): void => {
					if (isAnomalyRule) {
						return;
					}

					thresholds?.forEach((threshold) => {
						if (threshold.thresholdValue !== undefined) {
							const { ctx } = u;
							ctx.save();
							const yPos = u.valToPos(
								convertValue(
									threshold.thresholdValue,
									threshold.thresholdUnit,
									yAxisUnit,
								),
								'y',
								true,
							);
							ctx.strokeStyle = threshold.thresholdColor || 'red';
							ctx.lineWidth = 2;
							ctx.setLineDash([10, 5]);
							ctx.beginPath();
							const plotLeft = u.bbox.left; // left edge of the plot area
							const plotRight = plotLeft + u.bbox.width; // right edge of the plot area
							ctx.moveTo(plotLeft, yPos);
							ctx.lineTo(plotRight, yPos);
							ctx.stroke();
							// Text configuration
							if (threshold.thresholdLabel) {
								const text = threshold.thresholdLabel;
								const textX = plotRight - ctx.measureText(text).width - 20;
								const canvasHeight = ctx.canvas.height;
								const yposHeight = canvasHeight - yPos;
								const isHeightGreaterThan90Percent = canvasHeight * 0.9 < yposHeight;
								// Adjust textY based on the condition
								let textY;
								if (isHeightGreaterThan90Percent) {
									textY = yPos + 15; // Below the threshold line
								} else {
									textY = yPos - 15; // Above the threshold line
								}
								ctx.fillStyle = threshold.thresholdColor || 'red';
								ctx.fillText(text, textX, textY);
							}
							ctx.restore();
						}
					});
				},
			],
			setSelect: [
				(self): void => {
					const selection = self.select;
					if (selection) {
						const startTime = self.posToVal(selection.left, 'x');
						const endTime = self.posToVal(selection.left + selection.width, 'x');

						const diff = endTime - startTime;

						if (typeof onDragSelect === 'function' && diff > 0) {
							onDragSelect(startTime * 1000, endTime * 1000);
						}
					}
				},
			],
			ready: [
				(self): void => {
					// Add CSS classes to the uPlot container based on legend position
					const uplotContainer = self.root;
					if (uplotContainer) {
						uplotContainer.classList.remove(
							'u-plot-right-legend',
							'u-plot-bottom-legend',
						);
						if (legendPosition === LegendPosition.RIGHT) {
							uplotContainer.classList.add('u-plot-right-legend');
						} else {
							uplotContainer.classList.add('u-plot-bottom-legend');
						}
					}

					const legend = self.root.querySelector('.u-legend');
					if (legend) {
						const legendElement = legend as HTMLElement;

						// Initialize cleanup array for legend element listeners
						(self as ExtendedUPlot)._legendElementCleanup = [];

						// Apply enhanced legend styling
						if (enhancedLegend) {
							applyEnhancedLegendStyling(
								legendElement,
								legendConfig,
								legendConfig.requiredRows,
								legendPosition,
							);
						}

						// Restore scroll position if available
						if (legendScrollPosition && setLegendScrollPosition) {
							requestAnimationFrame(() => {
								legendElement.scrollTop = legendScrollPosition.scrollTop;
								legendElement.scrollLeft = legendScrollPosition.scrollLeft;
							});
						}

						// Set up scroll position tracking
						if (setLegendScrollPosition) {
							const handleScroll = (): void => {
								setLegendScrollPosition({
									scrollTop: legendElement.scrollTop,
									scrollLeft: legendElement.scrollLeft,
								});
							};

							legendElement.addEventListener('scroll', handleScroll);

							// Store cleanup function
							(self as ExtendedUPlot)._legendScrollCleanup = (): void => {
								legendElement.removeEventListener('scroll', handleScroll);
							};
						}

						// Global cleanup function for all legend tooltips
						const cleanupAllTooltips = (): void => {
							const existingTooltips = document.querySelectorAll('.legend-tooltip');
							existingTooltips.forEach((tooltip) => tooltip.remove());
						};

						// Add single global cleanup listener for this chart
						const globalCleanupHandler = (e: MouseEvent): void => {
							const target = e.target as HTMLElement;
							if (
								target &&
								!target?.closest?.('.u-legend') &&
								!target?.classList?.contains?.('legend-tooltip')
							) {
								cleanupAllTooltips();
							}
						};
						document?.addEventListener('mousemove', globalCleanupHandler);

						// Store cleanup function for potential removal later
						(self as ExtendedUPlot)._tooltipCleanup = (): void => {
							cleanupAllTooltips();
							document?.removeEventListener('mousemove', globalCleanupHandler);
						};

						const seriesEls = legend.querySelectorAll('.u-series');
						const seriesArray = Array.from(seriesEls);
						seriesArray.forEach((seriesEl, index) => {
							// Add tooltip and proper text wrapping for legends
							const thElement = seriesEl.querySelector('th');
							if (thElement && seriesLabels[index]) {
								// Store the original marker element before clearing
								const markerElement = thElement.querySelector('.u-marker');
								const markerClone = markerElement
									? (markerElement.cloneNode(true) as HTMLElement)
									: null;

								// Get the current text content
								const legendText = seriesLabels[index];

								// Clear the th content and rebuild it
								thElement.innerHTML = '';

								// Add back the marker
								if (markerClone) {
									thElement.appendChild(markerClone);
								}

								// Create text wrapper
								const textSpan = document.createElement('span');
								textSpan.className = 'legend-text';
								textSpan.textContent = legendText;
								thElement.appendChild(textSpan);

								// Setup tooltip functionality - check truncation on hover
								let tooltipElement: HTMLElement | null = null;
								let isHovering = false;

								const showTooltip = (e: MouseEvent): void => {
									// Check if text is actually truncated at the time of hover
									const isTextTruncated = (): boolean => {
										// For right-side legends, check if text overflows the container
										if (legendPosition === LegendPosition.RIGHT) {
											return textSpan?.scrollWidth > textSpan?.clientWidth;
										}
										// For bottom legends, check if text is longer than reasonable display length
										return legendText.length > 20;
									};

									// Only show tooltip if text is actually truncated
									if (!isTextTruncated()) {
										return;
									}

									isHovering = true;

									// Clean up any existing tooltips first
									cleanupAllTooltips();

									// Small delay to ensure cleanup is complete and DOM is ready
									setTimeout(() => {
										if (!isHovering) return; // Don't show if mouse already left

										// Double-check no tooltip exists
										if (document.querySelector('.legend-tooltip')) {
											return;
										}

										// Create tooltip element
										tooltipElement = document.createElement('div');
										tooltipElement.className = 'legend-tooltip';
										tooltipElement.textContent = legendText;
										tooltipElement.style.cssText = `
											position: fixed;
											padding: 8px 12px;
											border-radius: 6px;
											font-size: 12px;
											z-index: 10000;
											pointer-events: none;
											white-space: nowrap;
											box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
											border: 1px solid #374151;
										`;

										// Position tooltip near cursor
										const rect = (e.target as HTMLElement)?.getBoundingClientRect?.();
										if (rect) {
											tooltipElement.style.left = `${e.clientX + 10}px`;
											tooltipElement.style.top = `${rect.top - 35}px`;
										}

										document.body.appendChild(tooltipElement);
									}, 15);
								};

								const hideTooltip = (): void => {
									isHovering = false;

									// Simple cleanup with a reasonable delay
									setTimeout(() => {
										if (!isHovering && tooltipElement) {
											tooltipElement.remove();
											tooltipElement = null;
										}
									}, 200);
								};

								// Simple tooltip events
								thElement.addEventListener('mouseenter', showTooltip);
								thElement.addEventListener('mouseleave', hideTooltip);

								// Store cleanup function for tooltip listeners
								(self as ExtendedUPlot)._legendElementCleanup?.push(() => {
									thElement.removeEventListener('mouseenter', showTooltip);
									thElement.removeEventListener('mouseleave', hideTooltip);
									// Cleanup any lingering tooltip
									if (tooltipElement) {
										tooltipElement.remove();
										tooltipElement = null;
									}
								});

								// Add click handlers for marker and text separately
								const currentMarker = thElement.querySelector('.u-marker');
								const textElement = thElement.querySelector('.legend-text');

								// Helper function to handle stack chart logic
								const handleStackChart = (): void => {
									setHiddenGraph?.((prev) => {
										if (isUndefined(prev)) {
											return { [index]: true };
										}
										if (prev[index] === true) {
											return undefined;
										}
										return { [index]: true };
									});
								};

								// Marker click handler - checkbox behavior (toggle individual series)
								if (currentMarker) {
									const markerClickHandler = (e: Event): void => {
										e.stopPropagation?.(); // Prevent event bubbling to text handler

										if (stackChart) {
											handleStackChart();
										}
										if (graphsVisibilityStates) {
											setGraphsVisibilityStates?.((prev) => {
												const newGraphVisibilityStates = [...prev];
												// Toggle the specific series visibility (checkbox behavior)
												newGraphVisibilityStates[index + 1] = !newGraphVisibilityStates[
													index + 1
												];

												saveLegendEntriesToLocalStorage?.({
													options: self,
													graphVisibilityState: newGraphVisibilityStates,
													name: id || '',
												});
												return newGraphVisibilityStates;
											});
										}
									};

									currentMarker.addEventListener('click', markerClickHandler);

									// Store cleanup function for marker click listener
									(self as ExtendedUPlot)._legendElementCleanup?.push(() => {
										currentMarker.removeEventListener('click', markerClickHandler);
									});
								}

								// Text click handler - show only/show all behavior (existing behavior)
								if (textElement) {
									const textClickHandler = (e: Event): void => {
										e.stopPropagation?.(); // Prevent event bubbling

										if (stackChart) {
											handleStackChart();
										}
										if (graphsVisibilityStates) {
											setGraphsVisibilityStates?.((prev) => {
												const newGraphVisibilityStates = [...prev];
												// Show only this series / show all behavior
												if (
													newGraphVisibilityStates[index + 1] &&
													newGraphVisibilityStates.every((value, i) =>
														i === index + 1 ? value : !value,
													)
												) {
													// If only this series is visible, show all
													newGraphVisibilityStates.fill(true);
												} else {
													// Otherwise, show only this series
													newGraphVisibilityStates.fill(false);
													newGraphVisibilityStates[index + 1] = true;
												}
												saveLegendEntriesToLocalStorage?.({
													options: self,
													graphVisibilityState: newGraphVisibilityStates,
													name: id || '',
												});
												return newGraphVisibilityStates;
											});
										}
									};

									textElement.addEventListener('click', textClickHandler);

									// Store cleanup function for text click listener
									(self as ExtendedUPlot)._legendElementCleanup?.push(() => {
										textElement.removeEventListener('click', textClickHandler);
									});
								}
							}
						});
					}
				},
			],
			destroy: [
				(self): void => {
					// Clean up legend scroll listener
					if ((self as ExtendedUPlot)._legendScrollCleanup) {
						(self as ExtendedUPlot)._legendScrollCleanup?.();
						(self as ExtendedUPlot)._legendScrollCleanup = undefined;
					}

					// Clean up tooltip global listener
					if ((self as ExtendedUPlot)._tooltipCleanup) {
						(self as ExtendedUPlot)._tooltipCleanup?.();
						(self as ExtendedUPlot)._tooltipCleanup = undefined;
					}

					// Clean up all legend element listeners
					if ((self as ExtendedUPlot)._legendElementCleanup) {
						(self as ExtendedUPlot)._legendElementCleanup?.forEach((cleanup) => {
							cleanup();
						});
						(self as ExtendedUPlot)._legendElementCleanup = [];
					}

					// Clean up any remaining tooltips in DOM
					const existingTooltips = document.querySelectorAll('.legend-tooltip');
					existingTooltips.forEach((tooltip) => tooltip.remove());
				},
			],
		},
		series: customSeries
			? customSeries(apiResponse?.data?.result || [])
			: getSeries({
					series:
						stackBarChart && isUndefined(hiddenGraph)
							? series || []
							: apiResponse?.data?.result || [],
					widgetMetaData: apiResponse?.data?.result || [],
					graphsVisibilityStates,
					panelType,
					currentQuery: query || currentQuery,
					stackBarChart,
					hiddenGraph,
					isDarkMode,
					colorMapping,
			  }),
		axes: getAxes({ isDarkMode, yAxisUnit, panelType, isLogScale }),
	};
};
