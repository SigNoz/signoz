import { QueryParams } from 'constants/query';
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
	const { children } = props;

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
		}),
		[
			alertState,
			alertType,
			handleAlertTypeChange,
			thresholdState,
			evaluationWindow,
			advancedOptions,
			notificationSettings,
		],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
