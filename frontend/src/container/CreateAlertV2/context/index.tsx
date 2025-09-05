import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	createContext,
	useContext,
	useMemo,
	useReducer,
	useState,
} from 'react';
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
	getInitialAlertType,
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
	const { currentQuery } = useQueryBuilder();
	const [alertType, setAlertType] = useState<AlertTypes>(
		getInitialAlertType(currentQuery),
	);
	const [alertDef] = useState<AlertDef>(buildInitialAlertDef(alertType));

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
			setAlertType,
			alertDef: alertDefV2,
			thresholdState,
			setThresholdState,
		}),
		[alertState, alertType, alertDefV2, thresholdState],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
