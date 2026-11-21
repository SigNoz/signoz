import type { AlertTypes } from 'types/api/alerts/alertTypes';

import type {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdState,
	EvaluationWindowState,
	NotificationSettingsState,
} from './context/types';

export interface CreateAlertProps {
	alertType: AlertTypes;
}

export interface GetCreateAlertLocalStateFromAlertDefReturn {
	basicAlertState: AlertState;
	thresholdState: AlertThresholdState;
	advancedOptionsState: AdvancedOptionsState;
	evaluationWindowState: EvaluationWindowState;
	notificationSettingsState: NotificationSettingsState;
}
