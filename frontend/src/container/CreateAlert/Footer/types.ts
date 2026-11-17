import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdState,
	EvaluationWindowState,
	NotificationSettingsState,
} from '../context/types';

export interface BuildCreateAlertRulePayloadArgs {
	alertType: AlertTypes;
	basicAlertState: AlertState;
	thresholdState: AlertThresholdState;
	advancedOptions: AdvancedOptionsState;
	evaluationWindow: EvaluationWindowState;
	notificationSettings: NotificationSettingsState;
	query: Query;
}
