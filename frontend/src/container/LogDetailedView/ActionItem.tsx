import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Popover } from 'antd';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import React, { Dispatch, memo, useCallback, useMemo } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

const removeJSONStringifyQuotes = (s: string) => {
	if (!s || !s.length) {
		return s;
	}

	if (s[0] === '"' && s[s.length - 1] === '"') {
		return s.slice(1, s.length - 1);
	}
	return s;
};
function ActionItem({ fieldKey, fieldValue, getLogs }) {
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

	const handleQueryAdd = (newQueryString) => {
		let updatedQueryString = queryString || '';

		if (updatedQueryString.length === 0) {
			updatedQueryString += `${newQueryString}`;
		} else {
			updatedQueryString += ` AND ${newQueryString}`;
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
	};
	const validatedFieldValue = removeJSONStringifyQuotes(fieldValue);
	const PopOverMenuContent = useMemo(
		() => (
			<Col>
				<Button
					type="text"
					size="small"
					onClick={() =>
						handleQueryAdd(
							generateFilterQuery({
								fieldKey,
								fieldValue: validatedFieldValue,
								type: 'IN',
							}),
						)
					}
				>
					<PlusCircleOutlined /> Filter for value
				</Button>
				<br />
				<Button
					type="text"
					size="small"
					onClick={() =>
						handleQueryAdd(
							generateFilterQuery({
								fieldKey,
								fieldValue: validatedFieldValue,
								type: 'NIN',
							}),
						)
					}
				>
					<MinusCircleOutlined /> Filter out value
				</Button>
			</Col>
		),
		[],
	);
	return (
		<Popover placement="bottomLeft" content={PopOverMenuContent} trigger="click">
			<Button type="text" size="small">
				...
			</Button>
		</Popover>
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

export default connect(null, mapDispatchToProps)(memo(ActionItem));
