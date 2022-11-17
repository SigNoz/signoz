import { CloseSquareOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import getStep from 'lib/getStep';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-use';
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

const { Search } = Input;

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

	const onDropDownToggleHandler = useCallback(
		(value) => (): void => {
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

	const { search } = useLocation();
	const dispatch = useDispatch();

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
					q: customQuery || queryString,
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
					q: customQuery || queryString,
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
			queryString,
		],
	);

	const urlQuery = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

	useEffect(() => {
		const urlQueryString = urlQuery.get('q');
		handleSearch(urlQueryString || '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [urlQuery]);

	return (
		<Container>
			<Search
				placeholder="Search Filter"
				value={queryString}
				onChange={(e): void => {
					updateQueryString(e.target.value);
				}}
				allowClear
				onSearch={handleSearch}
			/>
			{showDropDown && (
				<DropDownContainer>
					<Button type="text" onClick={onDropDownToggleHandler(false)}>
						<CloseSquareOutlined />
					</Button>
					<SearchFields updateParsedQuery={updateParsedQuery as never} />
				</DropDownContainer>
			)}
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

export default connect(null, mapDispatchToProps)(memo(SearchFilter));
