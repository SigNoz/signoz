import { useEffect } from 'react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isEqual } from 'lodash-es';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import { getSmallestDeviation, syncAnomalyFunction } from './utils';

// These args only drive the preview; the rule reads the threshold target and condition.seasonality.
export function useAnomalyFunctionSync(): void {
	const { alertType, thresholdState } = useCreateAlertState();
	const { currentQuery, handleSetQueryData } = useQueryBuilder();

	const isAnomalyAlert = alertType === AlertTypes.ANOMALY_BASED_ALERT;
	const zScoreThreshold = getSmallestDeviation(thresholdState.thresholds);
	const { seasonality } = thresholdState;

	useEffect(() => {
		const namedArgs = isAnomalyAlert
			? { z_score_threshold: zScoreThreshold, seasonality }
			: undefined;
		currentQuery.builder.queryData.forEach((queryData, index) => {
			const currentFunctions = queryData.functions || [];
			const functions = syncAnomalyFunction(currentFunctions, namedArgs);
			if (!isEqual(functions, currentFunctions)) {
				handleSetQueryData(index, { ...queryData, functions });
			}
		});
	}, [
		currentQuery.builder.queryData,
		isAnomalyAlert,
		zScoreThreshold,
		seasonality,
		handleSetQueryData,
	]);
}
