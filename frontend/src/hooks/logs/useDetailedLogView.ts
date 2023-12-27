import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import ILogsReducer from 'types/reducer/logs';

import { UseDetailedLogView } from './types';
import { useActiveLog } from './useActiveLog';

export const useDetailedLogView = (): UseDetailedLogView => {
	const { onClearLogDetails, onAddToQuery } = useActiveLog();

	const { activeLog } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	return {
		onClearLogDetails,
		onAddToQuery,
		activeLog,
	};
};
