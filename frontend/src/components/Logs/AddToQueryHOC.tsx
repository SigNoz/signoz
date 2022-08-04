import { Button, Popover, Tag, Tooltip } from 'antd';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import React, { memo, useCallback, useMemo } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

function AddToQueryHOC({ fieldKey, fieldValue, children, getLogs }) {
	const {
		searchFilter: { queryString },
		logLinesPerPage,
		idStart,
		idEnd,
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const dispatch = useDispatch();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const generatedQuery = useMemo(
		() => generateFilterQuery({ fieldKey, fieldValue, type: 'IN' }),
		[fieldKey, fieldValue],
	);

	const handleQueryAdd = useCallback(() => {
		let updatedQueryString = queryString || '';

		if (updatedQueryString.length === 0) {
			updatedQueryString += `${generatedQuery}`;
		} else {
			updatedQueryString += ` AND ${generatedQuery}`;
		}
		dispatch({
			type: SET_SEARCH_QUERY_STRING,
			payload: updatedQueryString,
		});
		getLogs({
			q: updatedQueryString,
			limit: logLinesPerPage,
			orderBy: 'timestamp',
			order: 'desc',
			timestampStart: minTime,
			timestampEnd: maxTime,
			...(idStart ? { idStart } : {}),
			...(idEnd ? { idEnd } : {}),
		});
	}, [
		dispatch,
		generatedQuery,
		getLogs,
		idEnd,
		idStart,
		logLinesPerPage,
		maxTime,
		minTime,
		queryString,
	]);

	const popOverContent = (
		<span style={{ fontSize: '0.9rem' }}>Add to query: {fieldKey}</span>
	);
	return (
		<Button
			size="small"
			type="text"
			style={{
				margin: 0,
				padding: 0,
			}}
			onClick={handleQueryAdd}
		>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</Button>
	);
}

interface DispatchProps {
	getLogs: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(AddToQueryHOC));
