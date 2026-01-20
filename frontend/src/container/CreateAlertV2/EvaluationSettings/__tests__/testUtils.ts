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
	setAlertState: jest.fn(),
	alertType: AlertTypes.METRICS_BASED_ALERT,
	setAlertType: jest.fn(),
	thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
	setThresholdState: jest.fn(),
	advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
	setAdvancedOptions: jest.fn(),
	evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
	setEvaluationWindow: jest.fn(),
	notificationSettings: INITIAL_NOTIFICATION_SETTINGS_STATE,
	setNotificationSettings: jest.fn(),
	discardAlertRule: jest.fn(),
	testAlertRule: jest.fn(),
	isCreatingAlertRule: false,
	isTestingAlertRule: false,
	createAlertRule: jest.fn(),
	isUpdatingAlertRule: false,
	updateAlertRule: jest.fn(),
	isEditMode: false,
	...overrides,
});

export const createMockEvaluationWindowState = (
	overrides?: Partial<EvaluationWindowState>,
): EvaluationWindowState => ({
	...INITIAL_EVALUATION_WINDOW_STATE,
	...overrides,
});
