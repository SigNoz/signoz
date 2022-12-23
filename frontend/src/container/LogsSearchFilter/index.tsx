import { Input, InputRef, Popover } from 'antd';
import useUrlQuery from 'hooks/useUrlQuery';
import getStep from 'lib/getStep';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TOGGLE_LIVE_TAIL } from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import SearchFields from './SearchFields';
import { Container, DropDownContainer } from './styles';
import { useSearchParser } from './useSearchParser';

function SearchFilter({
	getLogs,
	getLogsAggregate,
}: SearchFilterProps): JSX.Element {
	const {
		queryString,
		updateParsedQuery,
		updateQueryString,
	} = useSearchParser();
	const [showDropDown, setShowDropDown] = useState(false);
	const searchRef = useRef<InputRef>(null);

	const onDropDownToggleHandler = useCallback(
		(value: boolean) => (): void => {
			setShowDropDown(value);
		},
		[],
	);

	const { logLinesPerPage, idEnd, idStart, liveTail } = useSelector<
		AppState,
		ILogsReducer
	>((state) => state.logs);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const handleSearch = useCallback(
		(customQuery) => {
			if (liveTail === 'PLAYING') {
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
			} else {
				getLogs({
					q: customQuery,
					limit: logLinesPerPage,
					orderBy: 'timestamp',
					order: 'desc',
					timestampStart: minTime,
					timestampEnd: maxTime,
					...(idStart ? { idGt: idStart } : {}),
					...(idEnd ? { idLt: idEnd } : {}),
				});

				getLogsAggregate({
					timestampStart: minTime,
					timestampEnd: maxTime,
					step: getStep({
						start: minTime,
						end: maxTime,
						inputFormat: 'ns',
					}),
					q: customQuery,
				});
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
		],
	);

	const urlQuery = useUrlQuery();
	const urlQueryString = urlQuery.get('q');

	useEffect(() => {
		handleSearch(urlQueryString || '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [urlQueryString, maxTime, minTime]);

	return (
		<Container>
			<Popover
				placement="bottom"
				content={
					<DropDownContainer>
						<SearchFields
							onDropDownToggleHandler={onDropDownToggleHandler}
							updateParsedQuery={updateParsedQuery as never}
						/>
					</DropDownContainer>
				}
				trigger="click"
				overlayInnerStyle={{
					width: `${searchRef?.current?.input?.offsetWidth || 0}px`,
				}}
				visible={showDropDown}
				destroyTooltipOnHide
				onVisibleChange={(value): void => {
					onDropDownToggleHandler(value)();
				}}
			>
				<Input.Search
					ref={searchRef}
					placeholder="Search Filter"
					value={queryString}
					onChange={(e): void => {
						updateQueryString(e.target.value);
					}}
					allowClear
					onSearch={handleSearch}
				/>
			</Popover>
		</Container>
	);
}

interface DispatchProps {
	getLogs: (
		props: Parameters<typeof getLogs>[0],
	) => (dispatch: Dispatch<AppActions>) => void;
	getLogsAggregate: (
		props: Parameters<typeof getLogsAggregate>[0],
	) => (dispatch: Dispatch<AppActions>) => void;
}

type SearchFilterProps = DispatchProps;

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(SearchFilter);
