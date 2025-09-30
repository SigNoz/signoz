import { AlertTypes } from 'types/api/alerts/alertTypes';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

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
	initialAlert?: PostableAlertRuleV2;
	isEditMode?: boolean;
}

export interface GetCreateAlertLocalStateFromAlertDefReturn {
	basicAlertState: AlertState;
	thresholdState: AlertThresholdState;
	advancedOptionsState: AdvancedOptionsState;
	evaluationWindowState: EvaluationWindowState;
	notificationSettingsState: NotificationSettingsState;
}
