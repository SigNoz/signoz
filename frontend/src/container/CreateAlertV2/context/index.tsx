import { QueryParams } from 'constants/query';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { useCreateAlertRule } from 'hooks/alerts/useCreateAlertRule';
import { useTestAlertRule } from 'hooks/alerts/useTestAlertRule';
import { useUpdateAlertRule } from 'hooks/alerts/useUpdateAlertRule';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from './constants';
import { ICreateAlertContextProps, ICreateAlertProviderProps } from './types';
import {
	advancedOptionsReducer,
	alertCreationReducer,
	alertThresholdReducer,
	buildInitialAlertDef,
	evaluationWindowReducer,
	getInitialAlertTypeFromURL,
	notificationSettingsReducer,
} from './utils';

const CreateAlertContext = createContext<ICreateAlertContextProps | null>(null);

// Hook exposing context state for CreateAlert
export const useCreateAlertState = (): ICreateAlertContextProps => {
	const context = useContext(CreateAlertContext);
	if (!context) {
		throw new Error(
			'useCreateAlertState must be used within CreateAlertProvider',
		);
	}
	return context;
};

export function CreateAlertProvider(
	props: ICreateAlertProviderProps,
): JSX.Element {
	const { children, initialAlertState, isEditMode, ruleId } = props;

	const [alertState, setAlertState] = useReducer(
		alertCreationReducer,
		INITIAL_ALERT_STATE,
	);

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);

	const [alertType, setAlertType] = useState<AlertTypes>(() =>
		getInitialAlertTypeFromURL(queryParams, currentQuery),
	);

	const handleAlertTypeChange = useCallback(
		(value: AlertTypes): void => {
			const queryToRedirect = buildInitialAlertDef(value);
			const currentQueryToRedirect = mapQueryDataFromApi(
				queryToRedirect.condition.compositeQuery,
			);
			redirectWithQueryBuilderData(
				currentQueryToRedirect,
				{
					[QueryParams.alertType]: value,
					[QueryParams.ruleType]:
						value === AlertTypes.ANOMALY_BASED_ALERT
							? AlertDetectionTypes.ANOMALY_DETECTION_ALERT
							: AlertDetectionTypes.THRESHOLD_ALERT,
				},
				undefined,
				true,
			);
			setAlertType(value);
		},
		[redirectWithQueryBuilderData],
	);

	const [thresholdState, setThresholdState] = useReducer(
		alertThresholdReducer,
		INITIAL_ALERT_THRESHOLD_STATE,
	);

	const [evaluationWindow, setEvaluationWindow] = useReducer(
		evaluationWindowReducer,
		INITIAL_EVALUATION_WINDOW_STATE,
	);

	const [advancedOptions, setAdvancedOptions] = useReducer(
		advancedOptionsReducer,
		INITIAL_ADVANCED_OPTIONS_STATE,
	);

	const [notificationSettings, setNotificationSettings] = useReducer(
		notificationSettingsReducer,
		INITIAL_NOTIFICATION_SETTINGS_STATE,
	);

	useEffect(() => {
		setThresholdState({
			type: 'RESET',
		});
	}, [alertType]);

	useEffect(() => {
		if (isEditMode && initialAlertState) {
			setAlertState({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState.basicAlertState,
			});
			setThresholdState({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState.thresholdState,
			});
			setEvaluationWindow({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState.evaluationWindowState,
			});
			setAdvancedOptions({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState.advancedOptionsState,
			});
			setNotificationSettings({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState.notificationSettingsState,
			});
		}
	}, [initialAlertState, isEditMode]);

	const discardAlertRule = useCallback(() => {
		setAlertState({
			type: 'RESET',
		});
		setThresholdState({
			type: 'RESET',
		});
		setEvaluationWindow({
			type: 'RESET',
		});
		setAdvancedOptions({
			type: 'RESET',
		});
		setNotificationSettings({
			type: 'RESET',
		});
		handleAlertTypeChange(AlertTypes.METRICS_BASED_ALERT);
	}, [handleAlertTypeChange]);

	const {
		mutate: createAlertRule,
		isLoading: isCreatingAlertRule,
	} = useCreateAlertRule();

	const {
		mutate: testAlertRule,
		isLoading: isTestingAlertRule,
	} = useTestAlertRule();

	const {
		mutate: updateAlertRule,
		isLoading: isUpdatingAlertRule,
	} = useUpdateAlertRule(ruleId || '');

	const contextValue: ICreateAlertContextProps = useMemo(
		() => ({
			alertState,
			setAlertState,
			alertType,
			setAlertType: handleAlertTypeChange,
			thresholdState,
			setThresholdState,
			evaluationWindow,
			setEvaluationWindow,
			advancedOptions,
			setAdvancedOptions,
			notificationSettings,
			setNotificationSettings,
			discardAlertRule,
			createAlertRule,
			isCreatingAlertRule,
			testAlertRule,
			isTestingAlertRule,
			updateAlertRule,
			isUpdatingAlertRule,
			isEditMode: isEditMode || false,
		}),
		[
			alertState,
			alertType,
			handleAlertTypeChange,
			thresholdState,
			evaluationWindow,
			advancedOptions,
			notificationSettings,
			discardAlertRule,
			createAlertRule,
			isCreatingAlertRule,
			testAlertRule,
			isTestingAlertRule,
			updateAlertRule,
			isUpdatingAlertRule,
			isEditMode,
		],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
