import { AlertTypes } from 'types/api/alerts/alertTypes';

import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdState,
	EvaluationWindowState,
	NotificationSettingsState,
} from './context/types';

export interface CreateAlertV2Props {
	alertType: AlertTypes;
}

export interface GetCreateAlertLocalStateFromAlertDefReturn {
	basicAlertState: AlertState;
	thresholdState: AlertThresholdState;
	advancedOptionsState: AdvancedOptionsState;
	evaluationWindowState: EvaluationWindowState;
	notificationSettingsState: NotificationSettingsState;
}
