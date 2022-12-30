import { Input, InputRef, Popover } from 'antd';
import useUrlQuery from 'hooks/useUrlQuery';
import getStep from 'lib/getStep';
import { debounce } from 'lodash-es';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { FLUSH_LOGS, TOGGLE_LIVE_TAIL } from 'types/actions/logs';
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
		updateParsedQuery,
		updateQueryString,
		queryString,
	} = useSearchParser();
	const [searchText, setSearchText] = useState(queryString);
	const [showDropDown, setShowDropDown] = useState(false);
	const searchRef = useRef<InputRef>(null);
	const { logLinesPerPage, idEnd, idStart, liveTail } = useSelector<
		AppState,
		ILogsReducer
	>((state) => state.logs);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	// keep sync with url queryString
	useEffect(() => {
		setSearchText(queryString);
	}, [queryString]);

	const debouncedupdateQueryString = useMemo(
		() => debounce(updateQueryString, 300),
		[updateQueryString],
	);

	const onDropDownToggleHandler = useCallback(
		(value: boolean) => (): void => {
			setShowDropDown(value);
		},
		[],
	);

	const handleSearch = useCallback(
		(customQuery) => {
			if (liveTail === 'PLAYING') {
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: 'PAUSED',
				});
				dispatch({
					type: FLUSH_LOGS,
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
		const debouncedHandleSearch = debounce(handleSearch, 600);
		debouncedHandleSearch(urlQueryString || '');

		return (): void => {
			debouncedHandleSearch.cancel();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		urlQueryString,
		maxTime,
		minTime,
		idEnd,
		idStart,
		logLinesPerPage,
		dispatch,
	]);

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
					value={searchText}
					onChange={(e): void => {
						const { value } = e.target;
						setSearchText(value);
						debouncedupdateQueryString(value);
					}}
					allowClear
				/>
			</Popover>
		</Container>
	);
}

interface DispatchProps {
	getLogs: typeof getLogs;
	getLogsAggregate: typeof getLogsAggregate;
}

type SearchFilterProps = DispatchProps;

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(SearchFilter);
