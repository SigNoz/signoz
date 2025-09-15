import { AlertDetectionTypes } from 'container/FormAlertRules';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import { AlertThresholdState } from '../context/types';
import { buildInitialAlertDef } from '../context/utils';

export function buildAlertDefForChartPreview({
	alertType,
	thresholdState,
}: {
	alertType: AlertTypes;
	thresholdState: AlertThresholdState;
}): AlertDef {
	const initialAlertDef = buildInitialAlertDef(alertType);

	return {
		...initialAlertDef,
		ruleType:
			alertType === AlertTypes.ANOMALY_BASED_ALERT
				? AlertDetectionTypes.ANOMALY_DETECTION_ALERT
				: AlertDetectionTypes.THRESHOLD_ALERT,
		condition: {
			...initialAlertDef.condition,
			targetUnit: thresholdState.thresholds?.[0].unit,
		},
	};
}
