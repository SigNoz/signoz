import { getDefaultOption } from 'container/Header/DateTimeSelection/config';
import {
	GLOBAL_TIME_LOADING_START,
	GlobalTimeAction,
	UPDATE_TIME_INTERVAL,
} from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

const intitalState: GlobalReducer = {
	maxTime: Date.now() * 1000000,
	minTime: (Date.now() - 15 * 60 * 1000) * 1000000,
	loading: true,
	selectedTime: getDefaultOption(window.location.pathname),
};

const globalTimeReducer = (
	state = intitalState,
	action: GlobalTimeAction,
): GlobalReducer => {
	switch (action.type) {
		case UPDATE_TIME_INTERVAL: {
			return {
				...state,
				...action.payload,
				loading: false,
			};
		}

		case GLOBAL_TIME_LOADING_START: {
			return {
				...state,
				loading: true,
			};
		}

		default:
			return state;
	}
};

export default globalTimeReducer;
