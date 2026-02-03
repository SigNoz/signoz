import getLabelName from 'lib/getLabelName';
import { AlignedData } from 'uplot';

export type DistributionSeriesInfo = {
	name: string;
	legend: string;
	queryName: string;
	totalCount: number;
	labels?: Record<string, string>;
};

export type DistributionData = {
	data: AlignedData;
	bucketLabels: string[];
	series: DistributionSeriesInfo[];
};

function formatBucketValue(val: number): string {
	if (val === 0) {
		return '0';
	}
	if (Math.abs(val) < 0.001) {
		return val.toExponential(2);
	}
	if (Math.abs(val) >= 1000) {
		return new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: 1,
		}).format(val);
	}
	return parseFloat(val.toFixed(2)).toString();
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function buildDistributionData(
	queryResult: any[] | undefined,
	bucketZoomRange?: { start: number; end: number } | null,
): DistributionData {
	if (!queryResult || queryResult.length === 0) {
		return {
			data: ([[0], [0]] as unknown) as AlignedData,
			bucketLabels: [],
			series: [],
		};
	}

	const bucketMap = new Map<
		string,
		{ start: number; end: number; label: string }
	>();

	queryResult.forEach((res) => {
		if (res.boundValues) {
			res.boundValues.forEach((bucket: any) => {
				const key = `${bucket.lowerBound}-${bucket.upperBound}`;
				if (!bucketMap.has(key)) {
					bucketMap.set(key, {
						start: bucket.lowerBound,
						end: bucket.upperBound,
						label: `${formatBucketValue(bucket.lowerBound)} - ${formatBucketValue(
							bucket.upperBound,
						)}`,
					});
				}
			});
		}
	});

	let sortedBuckets = Array.from(bucketMap.values()).sort(
		(a, b) => a.start - b.start,
	);

	if (bucketZoomRange) {
		sortedBuckets = sortedBuckets.slice(
			bucketZoomRange.start,
			bucketZoomRange.end + 1,
		);
	}

	const bucketLabels = sortedBuckets.map((b) => b.label);
	const xValues = sortedBuckets.map((_, idx) => idx);

	const seriesData: number[][] = [];
	const seriesInfo: DistributionSeriesInfo[] = [];

	queryResult.forEach((res) => {
		if (res.boundValues) {
			const bucketValueMap = new Map<string, number>();
			let total = 0;

			res.boundValues.forEach((bucket: any) => {
				const key = `${bucket.lowerBound}-${bucket.upperBound}`;
				bucketValueMap.set(key, bucket.value);
				total += bucket.value;
			});

			const alignedCounts = sortedBuckets.map((globalBucket) => {
				const key = `${globalBucket.start}-${globalBucket.end}`;
				return bucketValueMap.get(key) || 0;
			});

			const labelsObj: Record<string, string> = res.metric || {};

			let legendName: string;
			if (Object.keys(labelsObj).length > 0) {
				legendName = getLabelName(labelsObj, res.queryName || '', res.legend || '');
			} else {
				legendName = res.queryName || res.metaData?.alias || 'Count';
			}

			seriesData.push(alignedCounts);
			seriesInfo.push({
				name: legendName,
				legend: res.legend || '',
				queryName: res.queryName || '',
				totalCount: total,
				labels: labelsObj,
			});
		}
	});

	return {
		data: ([xValues, ...seriesData] as unknown) as AlignedData,
		bucketLabels,
		series: seriesInfo,
	};
}
