import { AppAction, SWITCH_DARK_MODE } from 'types/actions/app';
import InitialValueTypes from 'types/reducer/app';

const InitialValue: InitialValueTypes = {
	isDarkMode: true,
};

const appReducer = (
	state = InitialValue,
	action: AppAction,
): InitialValueTypes => {
	switch (action.type) {
		case SWITCH_DARK_MODE: {
			return {
				...state,
				isDarkMode: !state.isDarkMode,
			};
		}

		default:
			return state;
	}
};

export default appReducer;
