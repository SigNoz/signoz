import { Input, InputRef, Popover } from 'antd';
import useUrlQuery from 'hooks/useUrlQuery';
import getStep from 'lib/getStep';
import debounce from 'lodash-es/debounce';
import { getIdConditions } from 'pages/Logs/utils';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import { getLogs } from 'store/actions/logs/getLogs';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	FLUSH_LOGS,
	SET_LOADING,
	SET_LOADING_AGGREGATE,
	TOGGLE_LIVE_TAIL,
} from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';
import { popupContainer } from 'utils/selectPopupContainer';

import SearchFields from './SearchFields';
import { Container, DropDownContainer } from './styles';
import { useSearchParser } from './useSearchParser';

function SearchFilter({
	getLogs,
	getLogsAggregate,
	getLogsFields,
}: SearchFilterProps): JSX.Element {
	const { updateQueryString, queryString } = useSearchParser();
	const [searchText, setSearchText] = useState(queryString);
	const [showDropDown, setShowDropDown] = useState(false);
	const searchRef = useRef<InputRef>(null);
	const { logLinesPerPage, idEnd, idStart, liveTail, order } = useSelector<
		AppState,
		ILogsReducer
	>((state) => state.logs);

	const globalTime = useSelector<AppState, GlobalReducer>(
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
		(customQuery: string) => {
			getLogsFields();
			const { maxTime, minTime } = globalTime;

			if (liveTail === 'PLAYING') {
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: 'PAUSED',
				});
				dispatch({
					type: FLUSH_LOGS,
				});
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: liveTail,
				});
				dispatch({
					type: SET_LOADING,
					payload: false,
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
					...(idStart ? { idGt: idStart } : {}),
					...(idEnd ? { idLt: idEnd } : {}),
				});
			} else {
				getLogs({
					q: customQuery,
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
			globalTime,
			getLogsFields,
			order,
		],
	);

	const urlQuery = useUrlQuery();
	const urlQueryString = urlQuery.get('q');

	useEffect(() => {
		dispatch({
			type: SET_LOADING,
			payload: true,
		});
		dispatch({
			type: SET_LOADING_AGGREGATE,
			payload: true,
		});

		const debouncedHandleSearch = debounce(handleSearch, 600);

		debouncedHandleSearch(urlQueryString || '');

		return (): void => {
			debouncedHandleSearch.cancel();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		urlQueryString,
		idEnd,
		idStart,
		logLinesPerPage,
		dispatch,
		globalTime.maxTime,
		globalTime.minTime,
		order,
	]);

	const onPopOverChange = useCallback(
		(isVisible: boolean) => {
			onDropDownToggleHandler(isVisible)();
		},
		[onDropDownToggleHandler],
	);

	return (
		<Container>
			<Popover
				getPopupContainer={popupContainer}
				placement="bottom"
				content={
					<DropDownContainer>
						<SearchFields
							updateQueryString={updateQueryString}
							onDropDownToggleHandler={onDropDownToggleHandler}
						/>
					</DropDownContainer>
				}
				trigger="click"
				overlayInnerStyle={{
					width: `${searchRef?.current?.input?.offsetWidth || 0}px`,
				}}
				open={showDropDown}
				destroyTooltipOnHide
				onOpenChange={onPopOverChange}
			>
				<Input.Search
					ref={searchRef}
					placeholder="Search Filter"
					value={searchText}
					onChange={(e): void => {
						const { value } = e.target;
						setSearchText(value);
					}}
					onSearch={debouncedupdateQueryString}
					allowClear
				/>
			</Popover>
		</Container>
	);
}

interface DispatchProps {
	getLogs: typeof getLogs;
	getLogsAggregate: typeof getLogsAggregate;
	getLogsFields: typeof GetLogsFields;
}

type SearchFilterProps = DispatchProps;

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
	getLogsFields: bindActionCreators(GetLogsFields, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(SearchFilter));
