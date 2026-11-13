import { logEventMock } from '__tests__/logEventMock';
import { initialQueriesMap } from 'constants/queryBuilder';
import { INITIAL_CREATE_ALERT_STATE } from 'container/CreateAlert/context/constants';
import { buildCreateAlertRulePayload } from 'container/CreateAlert/Footer/utils';
import { cloneDeep, set } from 'lodash-es';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { trackAlertEdit } from '../trackAlertEdit';

const state = INITIAL_CREATE_ALERT_STATE;
const initial = buildCreateAlertRulePayload({
	alertType: AlertTypes.METRICS_BASED_ALERT,
	basicAlertState: state.basic,
	thresholdState: state.threshold,
	advancedOptions: state.advancedOptions,
	evaluationWindow: state.evaluationWindow,
	notificationSettings: state.notificationSettings,
	query: initialQueriesMap.metrics,
});

it.each([
	['alert', 'private name', 'alert_definition', 'alert'],
	['condition.thresholds.spec', [], 'alert_condition', 'condition.thresholds'],
	['evaluation.spec.frequency', '2m', 'evaluation_settings', 'evaluation'],
	[
		'notificationSettings.usePolicy',
		true,
		'notification_settings',
		'notificationSettings',
	],
])(
	'tracks %s without including its value',
	(field, value, section, expectedField) => {
		const updated = set(cloneDeep(initial), field, value);
		trackAlertEdit(initial, updated, 'rule-id');
		expect(logEventMock).toHaveBeenCalledWith('Alert: Edited', {
			ruleId: 'rule-id',
			editedFields: [expectedField],
			editedSections: [section],
		});
	},
);

it('does not report an unchanged save or default normalization as an edit', () => {
	trackAlertEdit(
		{ ...initial, labels: undefined, notificationSettings: undefined },
		initial,
		'rule-id',
	);
	expect(logEventMock).not.toHaveBeenCalled();
});
