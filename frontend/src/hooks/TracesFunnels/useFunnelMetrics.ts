import { MetricItem } from 'pages/TracesFunnelDetails/components/FunnelResults/FunnelMetricsTable';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';

import { useFunnelOverview } from './useFunnels';

interface FunnelMetricsParams {
	funnelId: string;
	stepStart?: number;
	stepEnd?: number;
}

interface SourceData {
	avg_rate?: number;
	errors?: number;
	avg_duration?: number;
	p99_latency?: number;
	conversion_rate?: number | null;
}

type RawData = {
	avg_rate?: number;
	errors?: number;
	avg_duration?: number | string;
	p99_latency?: number | string;
	conversion_rate?: number | null;
};

const DURATION_UNITS = [
	{ threshold: 1000000000, divisor: 1000000000, unit: 's' },
	{ threshold: 1000000, divisor: 1000000, unit: 'ms' },
	{ threshold: 1000, divisor: 1000, unit: 'µs' },
	{ threshold: 0, divisor: 1, unit: 'ns' },
] as const;

const getDurationUnit = (value: number): typeof DURATION_UNITS[number] =>
	DURATION_UNITS.find((u) => value >= u.threshold) ||
	DURATION_UNITS[DURATION_UNITS.length - 1];

const formatDuration = (value: number | undefined | null): string => {
	if (value === undefined || value === null) return '0 ns';
	try {
		const unit = getDurationUnit(value);
		const convertedValue = value / unit.divisor;
		return `${convertedValue.toFixed(2)} ${unit.unit}`;
	} catch (error) {
		console.error('Error formatting duration:', error);
		return '0 ns';
	}
};

const formatValue = (value: number | undefined | null): string => {
	if (value === undefined || value === null) return '0';
	try {
		return value.toString();
	} catch (error) {
		console.error('Error formatting value:', error);
		return '0';
	}
};

const formatRate = (value: number | undefined | null): string => {
	const rate = value || 0;
	return `${Number(rate.toFixed(2))} req/s`;
};

const createMetricsData = (
	sourceData: SourceData | undefined,
): MetricItem[] => {
	if (!sourceData) return [];

	return [
		{
			title: 'Avg. Rate',
			value: formatRate(sourceData.avg_rate),
		},
		{
			title: 'Errors',
			value: formatValue(sourceData.errors),
		},
		{
			title: 'Avg. Duration',
			value: formatDuration(sourceData.avg_duration),
		},
		{
			title: 'P99 Latency',
			value: formatDuration(sourceData.p99_latency),
		},
	];
};

export function useFunnelMetrics({
	funnelId,
	stepStart,
	stepEnd,
}: FunnelMetricsParams): {
	isLoading: boolean;
	isError: boolean;
	metricsData: MetricItem[];
	conversionRate: number;
} {
	const { startTime, endTime } = useFunnelContext();
	const payload = {
		start_time: startTime,
		end_time: endTime,
		...(stepStart !== undefined && { step_start: stepStart }),
		...(stepEnd !== undefined && { step_end: stepEnd }),
	};

	const {
		data: overviewData,
		isLoading,
		isFetching,
		isError,
	} = useFunnelOverview(funnelId, payload);

	const metricsData = useMemo(() => {
		const rawData = overviewData?.payload?.data?.[0]?.data as RawData | undefined;
		console.log('Raw data:', rawData);

		if (!rawData) return [];

		const avgDurationMs = rawData.avg_duration;
		const p99Ms = rawData.p99_latency;

		const sourceData: SourceData = {
			avg_rate: rawData.avg_rate,
			errors: rawData.errors,
			avg_duration:
				avgDurationMs !== undefined
					? Number(avgDurationMs) * 1_000_000 // ms to ns
					: undefined,
			p99_latency:
				p99Ms !== undefined
					? Number(p99Ms) * 1_000_000 // ms to ns
					: undefined,
			conversion_rate: rawData.conversion_rate,
		};

		try {
			return createMetricsData(sourceData);
		} catch (error) {
			console.error('Error processing metrics data:', error);
			return [];
		}
	}, [overviewData]);

	const conversionRate = Number(
		overviewData?.payload?.data?.[0]?.data?.conversion_rate || 0,
	);

	return {
		isLoading: isLoading || isFetching,
		isError,
		metricsData,
		conversionRate,
	};
}
