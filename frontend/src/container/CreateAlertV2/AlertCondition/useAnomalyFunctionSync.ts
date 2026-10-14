import { useEffect } from 'react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isEqual } from 'lodash-es';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { useCreateAlertState } from '../context';
import { syncAnomalyFunction } from './utils';

// The anomaly function's z-score only draws the preview bands; alerting uses the threshold target.
export function useAnomalyFunctionSync(): void {
	const { alertType, thresholdState } = useCreateAlertState();
	const { currentQuery, handleSetQueryData } = useQueryBuilder();

	const zScoreThreshold =
		alertType === AlertTypes.ANOMALY_BASED_ALERT
			? Number(thresholdState.thresholds[0]?.thresholdValue)
			: undefined;

	useEffect(() => {
		currentQuery.builder.queryData.forEach((queryData, index) => {
			const currentFunctions = queryData.functions || [];
			const functions = syncAnomalyFunction(currentFunctions, zScoreThreshold);
			if (!isEqual(functions, currentFunctions)) {
				handleSetQueryData(index, { ...queryData, functions });
			}
		});
	}, [currentQuery.builder.queryData, zScoreThreshold, handleSetQueryData]);
}
