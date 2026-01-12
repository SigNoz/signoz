import { Row } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import SelectAlertType from 'container/CreateAlertRule/SelectAlertType';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

function AlertTypeSelectionPage(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const queryParams = useUrlQuery();

	useEffect(() => {
		logEvent('Alert: New alert data source selection page visited', {});
	}, []);

	const handleSelectType = useCallback(
		(type: AlertTypes): void => {
			// For anamoly based alert, we need to set the ruleType to anomaly_rule
			// and alertType to metrics_based_alert
			if (type === AlertTypes.ANOMALY_BASED_ALERT) {
				queryParams.set(
					QueryParams.ruleType,
					AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
				);
				queryParams.set(QueryParams.alertType, AlertTypes.METRICS_BASED_ALERT);
				// For other alerts, we need to set the ruleType to threshold_rule
				// and alertType to the selected type
			} else {
				queryParams.set(QueryParams.ruleType, AlertDetectionTypes.THRESHOLD_ALERT);
				queryParams.set(QueryParams.alertType, type);
			}

			const showNewCreateAlertsPageFlag = queryParams.get(
				QueryParams.showNewCreateAlertsPage,
			);
			if (showNewCreateAlertsPageFlag === 'true') {
				queryParams.set(QueryParams.showNewCreateAlertsPage, 'true');
			}

			safeNavigate(`${ROUTES.ALERTS_NEW}?${queryParams.toString()}`);
		},
		[queryParams, safeNavigate],
	);

	return (
		<Row wrap={false}>
			<SelectAlertType onSelect={handleSelectType} />
		</Row>
	);
}

export default AlertTypeSelectionPage;
