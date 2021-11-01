import { Time } from 'container/Header/DateTimeSelection/config';
import getMinAgo from 'lib/getStartAndEndTime/getMinAgo';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';

export const UpdateTimeInterval = (
	interval: Time,
	dateTimeRange: [number, number] = [0, 0],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		let maxTime = new Date().getTime();
		let minTime = 0;

		if (interval === '1min') {
			const minTimeAgo = getMinAgo({ minutes: 1 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '15min') {
			const minTimeAgo = getMinAgo({ minutes: 15 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '1hr') {
			const minTimeAgo = getMinAgo({ minutes: 60 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '30min') {
			const minTimeAgo = getMinAgo({ minutes: 30 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '5min') {
			const minTimeAgo = getMinAgo({ minutes: 5 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '1day') {
			// one day = 24*60(min)
			const minTimeAgo = getMinAgo({ minutes: 26 * 60 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '1week') {
			// one week = one day * 7
			const minTimeAgo = getMinAgo({ minutes: 26 * 60 * 7 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === '6hr') {
			const minTimeAgo = getMinAgo({ minutes: 6 * 60 }).getTime();
			minTime = minTimeAgo;
		} else if (interval === 'custom') {
			maxTime = dateTimeRange[1];
			minTime = dateTimeRange[0];
		}

		dispatch({
			type: 'UPDATE_TIME_INTERVAL',
			payload: {
				maxTime: maxTime * 1000000, // in nano sec,
				minTime: minTime * 1000000,
			},
		});
	};
};

export const GlobalTimeLoading = (): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'GLOBAL_TIME_LOADING_START',
		});
	};
};
