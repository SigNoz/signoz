import LogDetail from 'components/LogDetail';
import ROUTES from 'constants/routes';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

function LogDetailedView(): JSX.Element {
	const history = useHistory();
	const {
		detailedLog,
		searchFilter: { queryString },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onDrawerClose = (): void => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: null,
		});
	};

	const handleQueryAdd = useCallback(
		(fieldKey: string, fieldValue: string) => {
			const generatedQuery = generateFilterQuery({
				fieldKey,
				fieldValue,
				type: 'IN',
			});

			let updatedQueryString = queryString || '';
			if (updatedQueryString.length === 0) {
				updatedQueryString += `${generatedQuery}`;
			} else {
				updatedQueryString += ` AND ${generatedQuery}`;
			}
			history.replace(`${ROUTES.LOGS}?q=${updatedQueryString}`);
		},
		[history, queryString],
	);

	return (
		<LogDetail
			log={detailedLog}
			onClose={onDrawerClose}
			onAddToQuery={handleQueryAdd}
		/>
	);
}

export default LogDetailedView;
