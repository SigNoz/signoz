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
import { QueryParams } from 'constants/query';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { useCreateAlertRule } from 'hooks/alerts/useCreateAlertRule';
import { useTestAlertRule } from 'hooks/alerts/useTestAlertRule';
import { useUpdateAlertRule } from 'hooks/alerts/useUpdateAlertRule';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { INITIAL_CREATE_ALERT_STATE } from './constants';
import {
	AdvancedOptionsAction,
	AlertThresholdAction,
	AlertThresholdMatchType,
	CreateAlertAction,
	CreateAlertSlice,
	EvaluationWindowAction,
	ICreateAlertContextProps,
	ICreateAlertProviderProps,
	NotificationSettingsAction,
} from './types';
import {
	buildInitialAlertDef,
	createAlertReducer,
	getInitialAlertTypeFromURL,
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
	const {
		children,
		initialAlertState,
		isEditMode,
		ruleId,
		initialAlertType,
	} = props;

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const [createAlertState, setCreateAlertState] = useReducer(
		createAlertReducer,
		{
			...INITIAL_CREATE_ALERT_STATE,
			basic: {
				...INITIAL_CREATE_ALERT_STATE.basic,
				yAxisUnit: currentQuery.unit,
			},
		},
	);

	const setAlertState = useCallback(
		(action: CreateAlertAction) => {
			setCreateAlertState({
				slice: CreateAlertSlice.BASIC,
				action,
			});
		},
		[setCreateAlertState],
	);

	const setThresholdState = useCallback(
		(action: AlertThresholdAction) => {
			setCreateAlertState({
				slice: CreateAlertSlice.THRESHOLD,
				action,
			});
		},
		[setCreateAlertState],
	);

	const setEvaluationWindow = useCallback(
		(action: EvaluationWindowAction) => {
			setCreateAlertState({
				slice: CreateAlertSlice.EVALUATION_WINDOW,
				action,
			});
		},
		[setCreateAlertState],
	);

	const setAdvancedOptions = useCallback(
		(action: AdvancedOptionsAction) => {
			setCreateAlertState({
				slice: CreateAlertSlice.ADVANCED_OPTIONS,
				action,
			});
		},
		[setCreateAlertState],
	);
	const setNotificationSettings = useCallback(
		(action: NotificationSettingsAction) => {
			setCreateAlertState({
				slice: CreateAlertSlice.NOTIFICATION_SETTINGS,
				action,
			});
		},
		[setCreateAlertState],
	);

	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const thresholdsFromURL = queryParams.get(QueryParams.thresholds);

	const [alertType, setAlertType] = useState<AlertTypes>(() => {
		if (isEditMode) {
			return initialAlertType;
		}
		return getInitialAlertTypeFromURL(queryParams, currentQuery);
	});

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

	useEffect(() => {
		setCreateAlertState({
			slice: CreateAlertSlice.THRESHOLD,
			action: {
				type: 'RESET',
			},
		});

		if (thresholdsFromURL) {
			try {
				const thresholds = JSON.parse(thresholdsFromURL);
				setCreateAlertState({
					slice: CreateAlertSlice.THRESHOLD,
					action: {
						type: 'SET_THRESHOLDS',
						payload: thresholds,
					},
				});
			} catch (error) {
				console.error('Error parsing thresholds from URL:', error);
			}

			setCreateAlertState({
				slice: CreateAlertSlice.EVALUATION_WINDOW,
				action: {
					type: 'SET_INITIAL_STATE_FOR_METER',
				},
			});

			setCreateAlertState({
				slice: CreateAlertSlice.THRESHOLD,
				action: {
					type: 'SET_MATCH_TYPE',
					payload: AlertThresholdMatchType.IN_TOTAL,
				},
			});
		}
	}, [alertType, thresholdsFromURL]);

	useEffect(() => {
		if (isEditMode && initialAlertState) {
			setCreateAlertState({
				type: 'SET_INITIAL_STATE',
				payload: initialAlertState,
			});
		}
	}, [initialAlertState, isEditMode]);

	const discardAlertRule = useCallback(() => {
		setCreateAlertState({
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
			alertState: createAlertState.basic,
			setAlertState,
			alertType,
			setAlertType: handleAlertTypeChange,
			thresholdState: createAlertState.threshold,
			setThresholdState,
			evaluationWindow: createAlertState.evaluationWindow,
			setEvaluationWindow,
			advancedOptions: createAlertState.advancedOptions,
			setAdvancedOptions,
			notificationSettings: createAlertState.notificationSettings,
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
			createAlertState,
			setAlertState,
			setThresholdState,
			setEvaluationWindow,
			setAdvancedOptions,
			setNotificationSettings,
			alertType,
			handleAlertTypeChange,
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
