import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from 'container/CreateAlertV2/context/constants';
import {
	EvaluationWindowState,
	ICreateAlertContextProps,
} from 'container/CreateAlertV2/context/types';
import { AlertTypes } from 'types/api/alerts/alertTypes';

export const createMockAlertContextState = (
	overrides?: Partial<ICreateAlertContextProps>,
): ICreateAlertContextProps => ({
	alertState: INITIAL_ALERT_STATE,
	setAlertState: vi.fn(),
	alertType: AlertTypes.METRICS_BASED_ALERT,
	setAlertType: vi.fn(),
	thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
	setThresholdState: vi.fn(),
	advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
	setAdvancedOptions: vi.fn(),
	evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
	setEvaluationWindow: vi.fn(),
	notificationSettings: INITIAL_NOTIFICATION_SETTINGS_STATE,
	setNotificationSettings: vi.fn(),
	discardAlertRule: vi.fn(),
	testAlertRule: vi.fn(),
	isCreatingAlertRule: false,
	isTestingAlertRule: false,
	createAlertRule: vi.fn(),
	isUpdatingAlertRule: false,
	updateAlertRule: vi.fn(),
	isEditMode: false,
	ruleId: '',
	...overrides,
});

export const createMockEvaluationWindowState = (
	overrides?: Partial<EvaluationWindowState>,
): EvaluationWindowState => ({
	...INITIAL_EVALUATION_WINDOW_STATE,
	...overrides,
});
