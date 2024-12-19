import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import ROUTES from 'constants/routes';
import { getOldLogsOperatorFromNew } from 'hooks/logs/useActiveLog';
import { getGeneratedFilterQueryString } from 'lib/getGeneratedFilterQueryString';
import getStep from 'lib/getStep';
import { getIdConditions } from 'pages/Logs/utils';
import { memo, useCallback } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	SET_DETAILED_LOG_DATA,
	SET_SEARCH_QUERY_STRING,
	TOGGLE_LIVE_TAIL,
} from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

type LogDetailedViewProps = {
	getLogs: (props: Parameters<typeof getLogs>[0]) => ReturnType<typeof getLogs>;
	getLogsAggregate: (
		props: Parameters<typeof getLogsAggregate>[0],
	) => ReturnType<typeof getLogsAggregate>;
};

function LogDetailedView({
	getLogs,
	getLogsAggregate,
}: LogDetailedViewProps): JSX.Element {
	const history = useHistory();
	const {
		detailedLog,
		searchFilter: { queryString },
		logLinesPerPage,
		idStart,
		liveTail,
		idEnd,
		order,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onDrawerClose = (): void => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: null,
		});
	};

	const handleAddToQuery = useCallback(
		(fieldKey: string, fieldValue: string, operator: string) => {
			const newOperator = getOldLogsOperatorFromNew(operator);
			const updatedQueryString = getGeneratedFilterQueryString(
				fieldKey,
				fieldValue,
				newOperator,
				queryString,
			);

			history.replace(`${ROUTES.OLD_LOGS_EXPLORER}?q=${updatedQueryString}`);
		},
		[history, queryString],
	);

	const handleClickActionItem = useCallback(
		(fieldKey: string, fieldValue: string, operator: string): void => {
			const newOperator = getOldLogsOperatorFromNew(operator);
			const updatedQueryString = getGeneratedFilterQueryString(
				fieldKey,
				fieldValue,
				newOperator,
				queryString,
			);

			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: {
					searchQueryString: updatedQueryString,
				},
			});

			if (liveTail === 'STOPPED') {
				getLogs({
					q: updatedQueryString,
					limit: logLinesPerPage,
					orderBy: 'timestamp',
					order,
					timestampStart: minTime,
					timestampEnd: maxTime,
					...getIdConditions(idStart, idEnd, order),
				});
				getLogsAggregate({
					timestampStart: minTime,
					timestampEnd: maxTime,
					step: getStep({
						start: minTime,
						end: maxTime,
						inputFormat: 'ns',
					}),
					q: updatedQueryString,
				});
			} else if (liveTail === 'PLAYING') {
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: 'PAUSED',
				});
				setTimeout(
					() =>
						dispatch({
							type: TOGGLE_LIVE_TAIL,
							payload: liveTail,
						}),
					0,
				);
			}
		},
		[
			dispatch,
			getLogs,
			getLogsAggregate,
			idEnd,
			idStart,
			liveTail,
			logLinesPerPage,
			maxTime,
			minTime,
			order,
			queryString,
		],
	);

	return (
		<LogDetail
			selectedTab={VIEW_TYPES.OVERVIEW}
			log={detailedLog}
			onClose={onDrawerClose}
			onAddToQuery={handleAddToQuery}
			onClickActionItem={handleClickActionItem}
		/>
	);
}

interface DispatchProps {
	getLogs: (props: Parameters<typeof getLogs>[0]) => (dispatch: never) => void;
	getLogsAggregate: (
		props: Parameters<typeof getLogsAggregate>[0],
	) => (dispatch: never) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default connect(null, mapDispatchToProps)(memo(LogDetailedView as any));
