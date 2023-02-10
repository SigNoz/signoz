import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Popover } from 'antd';
import getStep from 'lib/getStep';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import React, { memo, useMemo } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_SEARCH_QUERY_STRING, TOGGLE_LIVE_TAIL } from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

const removeJSONStringifyQuotes = (s: string): string => {
	if (!s || !s.length) {
		return s;
	}

	if (s[0] === '"' && s[s.length - 1] === '"') {
		return s.slice(1, s.length - 1);
	}
	return s;
};

interface ActionItemProps {
	fieldKey: string;
	fieldValue: string;
	getLogsProp: (
		props: Parameters<typeof getLogs>[0],
	) => ReturnType<typeof getLogs>;
	getLogsAggregateProp: (
		props: Parameters<typeof getLogsAggregate>[0],
	) => ReturnType<typeof getLogsAggregate>;
}
function ActionItem({
	fieldKey,
	fieldValue,
	getLogsProp,
	getLogsAggregateProp,
}: ActionItemProps): JSX.Element | unknown {
	const {
		searchFilter: { queryString },
		logLinesPerPage,
		idStart,
		liveTail,
		idEnd,
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const handleQueryAdd = (newQueryString: string): void => {
		let updatedQueryString = queryString || '';

		if (updatedQueryString.length === 0) {
			updatedQueryString += `${newQueryString}`;
		} else {
			updatedQueryString += ` AND ${newQueryString}`;
		}
		dispatch({
			type: SET_SEARCH_QUERY_STRING,
			payload: {
				searchQueryString: updatedQueryString,
			},
		});

		if (liveTail === 'STOPPED') {
			getLogsProp({
				q: updatedQueryString,
				limit: logLinesPerPage,
				orderBy: 'timestamp',
				order: 'desc',
				timestampStart: minTime,
				timestampEnd: maxTime,
				...(idStart ? { idGt: idStart } : {}),
				...(idEnd ? { idLt: idEnd } : {}),
			});
			getLogsAggregateProp({
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
	};
	const validatedFieldValue = removeJSONStringifyQuotes(fieldValue);
	const PopOverMenuContent = useMemo(
		() => (
			<Col>
				<Button
					type="text"
					size="small"
					onClick={(): void =>
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
					onClick={(): void =>
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fieldKey, validatedFieldValue],
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
export default connect(null, mapDispatchToProps)(memo(ActionItem as any));
