import { getDefaultOption } from 'container/TopNav/DateTimeSelection/config';
import {
	GLOBAL_TIME_LOADING_START,
	GlobalTimeAction,
	UPDATE_AUTO_REFRESH_DISABLED,
	UPDATE_AUTO_REFRESH_INTERVAL,
	UPDATE_TIME_INTERVAL,
} from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

const intitalState: GlobalReducer = {
	maxTime: Date.now() * 1000000,
	minTime: (Date.now() - 15 * 60 * 1000) * 1000000,
	loading: true,
	selectedTime: getDefaultOption(
		typeof window !== 'undefined' ? window?.location?.pathname : '',
	),
	isAutoRefreshDisabled: false,
	selectedAutoRefreshInterval: '',
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

		case UPDATE_AUTO_REFRESH_DISABLED: {
			return {
				...state,
				isAutoRefreshDisabled: action.payload,
			};
		}

		case UPDATE_AUTO_REFRESH_INTERVAL: {
			return {
				...state,
				selectedAutoRefreshInterval: action.payload,
			};
		}

		default:
			return state;
	}
};

export default globalTimeReducer;
