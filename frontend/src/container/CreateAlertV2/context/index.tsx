import { QueryParams } from 'constants/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

import {
	INITIAL_ALERT_STATE,
	INITIAL_ALERT_THRESHOLD_STATE,
} from './constants';
import { ICreateAlertContextProps, ICreateAlertProviderProps } from './types';
import {
	alertCreationReducer,
	alertThresholdReducer,
	buildInitialAlertDef,
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
	const [alertDef] = useState<AlertDef>(buildInitialAlertDef(alertType));

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

	const alertDefV2: AlertDef = useMemo(
		() => ({
			...alertDef,
			condition: {
				...alertDef.condition,
				thresholds: thresholdState.thresholds,
				matchType: thresholdState.matchType,
				operator: thresholdState.operator,
				selectedQuery: thresholdState.selectedQuery,
				evaluationWindow: thresholdState.evaluationWindow,
				algorithm: thresholdState.algorithm,
				seasonality: thresholdState.seasonality,
			},
		}),
		[alertDef, thresholdState],
	);

	const contextValue: ICreateAlertContextProps = useMemo(
		() => ({
			alertState,
			setAlertState,
			alertType,
			setAlertType: handleAlertTypeChange,
			alertDef: alertDefV2,
			thresholdState,
			setThresholdState,
		}),
		[alertState, alertType, handleAlertTypeChange, alertDefV2, thresholdState],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
