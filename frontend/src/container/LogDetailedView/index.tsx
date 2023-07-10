import LogDetail from 'components/LogDetail';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

function LogDetailedView(): JSX.Element {
	const { detailedLog } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onDrawerClose = (): void => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: null,
		});
	};

	return <LogDetail log={detailedLog} onClose={onDrawerClose} />;
}

export default LogDetailedView;
