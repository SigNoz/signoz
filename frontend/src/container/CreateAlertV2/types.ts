import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdState,
	EvaluationWindowState,
	NotificationSettingsState,
} from './context/types';

export interface CreateAlertV2Props {
	alertType: AlertTypes;
	ruleId?: string;
	initialAlertDef?: AlertDef;
	isEditMode?: boolean;
}

export interface GetCreateAlertLocalStateFromAlertDefReturn {
	basicAlertState: AlertState;
	thresholdState: AlertThresholdState;
	advancedOptionsState: AdvancedOptionsState;
	evaluationWindowState: EvaluationWindowState;
	notificationSettingsState: NotificationSettingsState;
}
