import { SelectProps } from 'antd';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import getStep from 'lib/getStep';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AlertDef } from 'types/api/alerts/def';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

// toChartInterval converts eval window to chart selection time interval
export const toChartInterval = (evalWindow: string | undefined): Time => {
	switch (evalWindow) {
		case '1m0s':
			return '1m';
		case '5m0s':
			return '5m';
		case '10m0s':
			return '10m';
		case '15m0s':
			return '15m';
		case '30m0s':
			return '30m';
		case '1h0m0s':
			return '1h';
		case '3h0m0s':
			return '3h';
		case '4h0m0s':
			return '4h';
		case '6h0m0s':
			return '6h';
		case '12h0m0s':
			return '12h';
		case '24h0m0s':
			return '1d';
		default:
			return '5m';
	}
};

export const getUpdatedStepInterval = (evalWindow?: string): number => {
	const { start, end } = getStartEndRangeTime({
		type: 'GLOBAL_TIME',
		interval: toChartInterval(evalWindow),
	});
	return getStep({
		start,
		end,
		inputFormat: 'ns',
	});
};

export const getSelectedQueryOptions = (
	queries: Array<
		IBuilderQuery | IBuilderFormula | IClickHouseQuery | IPromQLQuery
	>,
): SelectProps['options'] =>
	queries
		.filter((query) => !query.disabled)
		.map((query) => ({
			label: 'queryName' in query ? query.queryName : query.name,
			value: 'queryName' in query ? query.queryName : query.name,
		}));

const THRESHOLD_COLORS_SORTING_ORDER = ['Red', 'Orange', 'Green', 'Blue'];

export const usePrefillAlertConditions = (
	stagedQuery: Query | null,
	alertDef: AlertDef,
	handleAlertDefChange: (props: AlertDef) => void,
): void => {
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

	const alertDefStringified = useMemo(() => JSON.stringify(alertDef), [
		alertDef,
	]);

	useEffect(() => {
		if (threshold) {
			console.log({ thresholdOperator, thresholdValue, thresholdUnit });
			handleAlertDefChange({
				...alertDef,
				condition: {
					...alertDef.condition,
					op: thresholdOperator || undefined,
					target: thresholdValue,
					targetUnit: thresholdUnit,
				},
			});
		}
		if (matchType) {
			handleAlertDefChange({
				...alertDef,
				condition: {
					...alertDef.condition,
					matchType,
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		matchType,
		thresholdOperator,
		thresholdValue,
		thresholdUnit,
		alertDefStringified,
		handleAlertDefChange,
		threshold,
	]);
};
