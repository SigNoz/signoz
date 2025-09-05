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

import { INITIAL_ALERT_STATE } from './constants';
import { ICreateAlertContextProps, ICreateAlertProviderProps } from './types';
import {
	alertCreationReducer,
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

	const contextValue: ICreateAlertContextProps = useMemo(
		() => ({
			alertState,
			setAlertState,
			alertType,
			setAlertType,
			alertDef,
		}),
		[alertState, alertType, alertDef],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
