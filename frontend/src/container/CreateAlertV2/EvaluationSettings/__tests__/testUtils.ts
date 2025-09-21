import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
} from 'container/CreateAlertV2/context/constants';
import { ICreateAlertContextProps } from 'container/CreateAlertV2/context/types';
import { AlertTypes } from 'types/api/alerts/alertTypes';

export const MOCK_ALERT_CONTEXT_STATE: ICreateAlertContextProps = {
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
};
