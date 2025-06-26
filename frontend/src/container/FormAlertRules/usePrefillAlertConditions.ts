import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

const THRESHOLD_COLORS_SORTING_ORDER = ['Red', 'Orange', 'Green', 'Blue'];

export const usePrefillAlertConditions = (
	stagedQuery: Query | null,
): {
	matchType: string | null;
	op: string | null;
	target: number | undefined;
	targetUnit: string | undefined;
} => {
	const [searchParams] = useSearchParams();

	// Extract and set match type
	const timeAggregation = useMemo(() => {
		if (!stagedQuery) return null;
		const isSameTimeAggregation = stagedQuery.builder.queryData.every(
			(queryData) =>
				queryData.timeAggregation ===
				stagedQuery.builder.queryData[0].timeAggregation,
		);
		return isSameTimeAggregation
			? stagedQuery.builder.queryData[0].timeAggregation
			: null;
	}, [stagedQuery]);

	const matchType = useMemo(() => {
		switch (timeAggregation) {
			case 'avg':
				return '3';
			case 'sum':
				return '4';
			default:
				return null;
		}
	}, [timeAggregation]);

	// Extract and set threshold operator, value and unit
	const threshold = useMemo(() => {
		let thresholds: ThresholdProps[] = [];
		const thresholdsParam = searchParams.get('thresholds');
		if (thresholdsParam) {
			try {
				thresholds = JSON.parse(thresholdsParam);
			} catch (error) {
				return null;
			}
		}
		if (thresholds.length === 0) return null;
		const sortedThresholds = thresholds.sort((a, b) => {
			const aIndex = THRESHOLD_COLORS_SORTING_ORDER.indexOf(
				a.thresholdColor || '',
			);
			const bIndex = THRESHOLD_COLORS_SORTING_ORDER.indexOf(
				b.thresholdColor || '',
			);
			return aIndex - bIndex;
		});
		return sortedThresholds[0];
	}, [searchParams]);

	const thresholdOperator = useMemo(() => {
		const op = threshold?.thresholdOperator;
		switch (op) {
			case '>':
			case '>=':
				return '1';
			case '<':
			case '<=':
				return '2';
			case '=':
				return '3';
			default:
				return null;
		}
	}, [threshold]);

	const thresholdUnit = useMemo(() => threshold?.thresholdUnit, [threshold]);

	const thresholdValue = useMemo(() => threshold?.thresholdValue, [threshold]);

	return {
		matchType,
		op: thresholdOperator,
		target: thresholdValue,
		targetUnit: thresholdUnit,
	};
};
