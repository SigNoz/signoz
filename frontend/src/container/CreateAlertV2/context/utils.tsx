import { AlertState, CreateAlertAction } from './types';

export const alertCreationReducer = (
	state: AlertState,
	action: CreateAlertAction,
): AlertState => {
	switch (action.type) {
		case 'SET_ALERT_NAME':
			return {
				...state,
				name: action.payload,
			};
		case 'SET_ALERT_DESCRIPTION':
			return {
				...state,
				description: action.payload,
			};
		case 'SET_ALERT_LABELS':
			return {
				...state,
				labels: action.payload,
			};
		default:
			return state;
	}
};
