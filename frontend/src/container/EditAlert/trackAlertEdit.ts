import logEvent from 'api/common/logEvent';
import { buildCreateAlertRulePayload } from 'container/CreateAlert/Footer/utils';
import {
	getAlertTypeFromAlertDef,
	getCreateAlertLocalStateFromAlertDef,
} from 'container/CreateAlert/utils';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { get, isEqual } from 'lodash-es';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypes';

const fieldSections: Record<string, string> = {
	alert: 'alert_definition',
	labels: 'alert_definition',
	'condition.compositeQuery': 'alert_definition',
	ruleType: 'alert_condition',
	'condition.selectedQueryName': 'alert_condition',
	'condition.thresholds': 'alert_condition',
	'condition.algorithm': 'alert_condition',
	'condition.seasonality': 'alert_condition',
	evaluation: 'evaluation_settings',
	'condition.alertOnAbsent': 'evaluation_settings',
	'condition.absentFor': 'evaluation_settings',
	'condition.requireMinPoints': 'evaluation_settings',
	'condition.requiredNumPoints': 'evaluation_settings',
	annotations: 'notification_settings',
	notificationSettings: 'notification_settings',
};

export function trackAlertEdit(
	initialAlert: PostableAlertRuleV2,
	updatedAlert: PostableAlertRuleV2,
	ruleId: string,
): void {
	const initialState = getCreateAlertLocalStateFromAlertDef(initialAlert);
	const baseline = buildCreateAlertRulePayload({
		alertType: getAlertTypeFromAlertDef(initialAlert),
		basicAlertState: initialState.basic,
		thresholdState: initialState.threshold,
		advancedOptions: initialState.advancedOptions,
		evaluationWindow: initialState.evaluationWindow,
		notificationSettings: initialState.notificationSettings,
		query: mapQueryDataFromApi(initialAlert.condition.compositeQuery),
	});
	const editedFields = Object.keys(fieldSections).filter(
		(field) => !isEqual(get(baseline, field), get(updatedAlert, field)),
	);
	if (editedFields.length) {
		void logEvent('Alert: Edited', {
			ruleId,
			editedFields,
			editedSections: [
				...new Set(editedFields.map((field) => fieldSections[field])),
			],
		});
	}
}
