import { AlignedData } from 'uplot';

export type DistributionSeriesInfo = {
	name: string;
	legend: string;
	queryName: string;
	totalCount: number;
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
		const bucketValueMap = new Map<string, number>();
		let total = 0;

		if (res.boundValues) {
			res.boundValues.forEach((b: any) => {
				const key = `${b.lowerBound}-${b.upperBound}`;
				bucketValueMap.set(key, b.value);
				total += b.value;
			});
		}

		const alignedCounts = sortedBuckets.map((globalBucket) => {
			const key = `${globalBucket.start}-${globalBucket.end}`;
			return bucketValueMap.get(key) || 0;
		});

		seriesData.push(alignedCounts);
		seriesInfo.push({
			name: res.metric?.name || res.queryName || '',
			legend: res.legend || '',
			queryName: res.queryName || '',
			totalCount: total,
		});
	});

	return {
		data: ([xValues, ...seriesData] as unknown) as AlignedData,
		bucketLabels,
		series: seriesInfo,
	};
}
