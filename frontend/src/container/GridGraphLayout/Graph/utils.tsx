import getStep from 'lib/getStep';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

export const useStep = (query: Widgets['query']): Widgets['query'] => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return {
		...query,
		builder: {
			...query.builder,
			queryData:
				query?.builder?.queryData?.map((item) => ({
					...item,
					stepInterval: getStep({
						end: maxTime,
						inputFormat: 'ns',
						start: minTime,
					}),
				})) || [],
		},
	};
};
