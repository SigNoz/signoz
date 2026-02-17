import { histogramBucketSizes } from '@grafana/data';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DEFAULT_BUCKET_COUNT } from 'container/PanelWrapper/constants';
import { getLegend } from 'lib/dashboard/getQueryResults';
import getLabelName from 'lib/getLabelName';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { AlignedData } from 'uplot';
import { incrRoundDn, roundDecimals } from 'utils/round';

import { PanelMode } from '../types';
import { buildBaseConfig } from '../utils/baseConfigBuilder';
import {
	buildHistogramBuckets,
	mergeAlignedDataTables,
	prependNullBinToFirstHistogramSeries,
	replaceUndefinedWithNullInAlignedData,
} from '../utils/histogram';

export interface PrepareHistogramPanelDataParams {
	apiResponse: MetricRangePayloadProps;
	bucketWidth?: number;
	bucketCount?: number;
	mergeAllActiveQueries?: boolean;
}

const BUCKET_OFFSET = 0;
const HIST_SORT = (a: number, b: number): number => a - b;

function extractNumericValues(
	result: MetricRangePayloadProps['data']['result'],
): number[] {
	const values: number[] = [];
	for (const item of result) {
		for (const [, valueStr] of item.values) {
			values.push(Number.parseFloat(valueStr) || 0);
		}
	}
	return values;
}

function computeSmallestDelta(sortedValues: number[]): number {
	if (sortedValues.length <= 1) {
		return 0;
	}
	let smallest = Infinity;
	for (let i = 1; i < sortedValues.length; i++) {
		const delta = sortedValues[i] - sortedValues[i - 1];
		if (delta > 0) {
			smallest = Math.min(smallest, delta);
		}
	}
	return smallest === Infinity ? 0 : smallest;
}

function selectBucketSize({
	range,
	bucketCount,
	smallestDelta,
	bucketWidthOverride,
}: {
	range: number;
	bucketCount: number;
	smallestDelta: number;
	bucketWidthOverride?: number;
}): number {
	if (bucketWidthOverride != null && bucketWidthOverride > 0) {
		return bucketWidthOverride;
	}
	const targetSize = range / bucketCount;
	for (const candidate of histogramBucketSizes) {
		if (targetSize < candidate && candidate >= smallestDelta) {
			return candidate;
		}
	}
	return 0;
}

function buildFrames(
	result: MetricRangePayloadProps['data']['result'],
	mergeAllActiveQueries: boolean,
): number[][] {
	const frames: number[][] = result.map((item) =>
		item.values.map(([, valueStr]) => Number.parseFloat(valueStr) || 0),
	);
	if (mergeAllActiveQueries && frames.length > 1) {
		const first = frames[0];
		for (let i = 1; i < frames.length; i++) {
			first.push(...frames[i]);
			frames[i] = [];
		}
	}
	return frames;
}

export function prepareHistogramPanelData({
	apiResponse,
	bucketWidth,
	bucketCount: bucketCountProp = DEFAULT_BUCKET_COUNT,
	mergeAllActiveQueries = false,
}: PrepareHistogramPanelDataParams): AlignedData {
	const bucketCount = bucketCountProp ?? DEFAULT_BUCKET_COUNT;
	const result = apiResponse.data.result;

	const seriesValues = extractNumericValues(result);
	if (seriesValues.length === 0) {
		return [[]];
	}

	const sorted = [...seriesValues].sort((a, b) => a - b);
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	const range = max - min;
	const smallestDelta = computeSmallestDelta(sorted);
	let bucketSize = selectBucketSize({
		range,
		bucketCount,
		smallestDelta,
		bucketWidthOverride: bucketWidth,
	});
	if (bucketSize <= 0) {
		bucketSize = range > 0 ? range / bucketCount : 1;
	}

	const getBucket = (v: number): number =>
		roundDecimals(incrRoundDn(v - BUCKET_OFFSET, bucketSize) + BUCKET_OFFSET, 9);

	const frames = buildFrames(result, mergeAllActiveQueries);
	const histogramsPerSeries: AlignedData[] = frames
		.filter((frame) => frame.length > 0)
		.map((frame) => buildHistogramBuckets(frame, getBucket, HIST_SORT));

	if (histogramsPerSeries.length === 0) {
		return [[]];
	}

	const mergedHistogramData = mergeAlignedDataTables(histogramsPerSeries);
	replaceUndefinedWithNullInAlignedData(mergedHistogramData);
	prependNullBinToFirstHistogramSeries(mergedHistogramData, bucketSize);
	return mergedHistogramData;
}

export function prepareHistogramPanelConfig({
	widget,
	apiResponse,
	panelMode,
	isDarkMode,
}: {
	widget: Widgets;
	apiResponse: MetricRangePayloadProps;
	panelMode: PanelMode;
	isDarkMode: boolean;
}): UPlotConfigBuilder {
	const builder = buildBaseConfig({
		widget,
		isDarkMode,
		apiResponse,
		panelMode,
		panelType: PANEL_TYPES.HISTOGRAM,
	});
	builder.setCursor({
		drag: {
			x: false,
			y: false,
			setScale: true,
		},
		focus: {
			prox: 1e3,
		},
	});

	builder.addScale({
		scaleKey: 'x',
		time: false,
		auto: true,
	});
	builder.addScale({
		scaleKey: 'y',
		time: false,
		auto: true,
		min: 0,
	});

	const currentQuery = widget.query;
	const mergeAllActiveQueries = widget?.mergeAllActiveQueries ?? false;

	// When merged, data has only one y column; add one series to match. Otherwise add one per result.
	if (mergeAllActiveQueries) {
		builder.addSeries({
			label: '',
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			panelType: PANEL_TYPES.HISTOGRAM,
			colorMapping: widget.customLegendColors ?? {},
			spanGaps: false,
			barWidthFactor: 1,
			pointSize: 5,
			lineColor: '#3f5ecc',
			fillColor: '#4E74F8',
			isDarkMode,
		});
	} else {
		apiResponse.data.result.forEach((series) => {
			const baseLabelName = getLabelName(
				series.metric,
				series.queryName || '', // query
				series.legend || '',
			);

			const label = currentQuery
				? getLegend(series, currentQuery, baseLabelName)
				: baseLabelName;

			builder.addSeries({
				label: label,
				scaleKey: 'y',
				drawStyle: DrawStyle.Bar,
				panelType: PANEL_TYPES.HISTOGRAM,
				colorMapping: widget.customLegendColors ?? {},
				spanGaps: false,
				barWidthFactor: 1,
				pointSize: 5,
				isDarkMode,
			});
		});
	}

	return builder;
}
