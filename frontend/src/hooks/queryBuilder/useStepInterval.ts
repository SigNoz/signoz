import getStep from 'lib/getStep';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

export const updateStepInterval = (
	query: Widgets['query'],
	maxTime: number,
	minTime: number,
	shallUpdateStepInterval?: boolean,
): Widgets['query'] => {
	const stepInterval = getStep({
		start: minTime,
		end: maxTime,
		inputFormat: 'ns',
	});

	function getStepInterval(customInterval: number): number {
		// if user enters some value then auto update should never come
		if (shallUpdateStepInterval) {
			return customInterval;
		}
		return stepInterval;
	}

	return {
		...query,
		builder: {
			...query?.builder,
			queryData:
				query?.builder?.queryData?.map((item) => ({
					...item,
					stepInterval: getStepInterval(item.stepInterval),
				})) || [],
		},
	};
};

export const useStepInterval = (query: Widgets['query']): Widgets['query'] => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return updateStepInterval(query, maxTime, minTime);
};
