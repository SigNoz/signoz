import { getDefaultOption } from 'container/TopNav/DateTimeSelection/config';
import {
	GLOBAL_TIME_LOADING_START,
	GlobalTimeAction,
	UPDATE_AUTO_REFRESH_DISABLED,
	UPDATE_AUTO_REFRESH_INTERVAL,
	UPDATE_TIME_INTERVAL,
} from 'types/actions/globalTime';
import {
	RESET_ID_START_AND_END,
	SET_SEARCH_QUERY_STRING,
} from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';

const initialState: GlobalReducer = {
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
	state = initialState,
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

		case RESET_ID_START_AND_END: {
			return {
				...state,
				maxTime: action.payload.maxTime,
				minTime: action.payload.minTime,
			};
		}

		case SET_SEARCH_QUERY_STRING: {
			const { globalTime } = action.payload;
			if (globalTime) {
				return {
					...state,
					maxTime: globalTime.maxTime,
					minTime: globalTime.minTime,
				};
			}

			return {
				...state,
			};
		}

		default:
			return state;
	}
};

export default globalTimeReducer;
