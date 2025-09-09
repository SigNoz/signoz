import {
	createContext,
	useContext,
	useMemo,
	useReducer,
	useState,
} from 'react';

import { INITIAL_ALERT_STATE } from './constants';
import {
	AlertCreationStep,
	ICreateAlertContextProps,
	ICreateAlertProviderProps,
} from './types';
import { alertCreationReducer } from './utils';

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
	const [step, setStep] = useState<AlertCreationStep>(
		AlertCreationStep.ALERT_DEFINITION,
	);

	const contextValue: ICreateAlertContextProps = useMemo(
		() => ({
			alertState,
			setAlertState,
			step,
			setStep,
		}),
		[alertState, setAlertState, step, setStep],
	);

	return (
		<CreateAlertContext.Provider value={contextValue}>
			{children}
		</CreateAlertContext.Provider>
	);
}
