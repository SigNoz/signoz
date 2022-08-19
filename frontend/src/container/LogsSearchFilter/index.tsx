/* eslint-disable react-hooks/exhaustive-deps */
import { CloseSquareOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import useClickOutside from 'hooks/useClickOutside';
import getStep from 'lib/getStep';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { DropDownContainer } from './styles';
import { useSearchParser } from './useSearchParser';

const { Search } = Input;

interface SearchFilterProps {
	getLogs: (props: Parameters<typeof getLogs>[0]) => ReturnType<typeof getLogs>;
	getLogsAggregate: (
		props: Parameters<typeof getLogsAggregate>[0],
	) => ReturnType<typeof getLogsAggregate>;
}
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

	const { logLinesPerPage, idEnd, idStart, liveTail } = useSelector<
		AppState,
		ILogsReducer
	>((state) => state.logs);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const searchComponentRef = useRef<HTMLDivElement>(null);

	useClickOutside(searchComponentRef, (e: HTMLElement) => {
		// using this hack as overlay span is voilating this condition
		if (
			e.nodeName === 'svg' ||
			e.nodeName === 'path' ||
			e.nodeName === 'span' ||
			e.nodeName === 'button'
		) {
			return;
		}

		if (
			e.nodeName === 'DIV' &&
			![
				'ant-empty-image',
				'ant-select-item',
				'ant-col',
				'ant-select-item-option-content',
				'ant-select-item-option-active',
			].find((p) => p.indexOf(e.className) !== -1) &&
			!(e.ariaSelected === 'true') &&
			showDropDown
		) {
			setShowDropDown(false);
		}
	});
	const { search } = useLocation();
	const dispatch = useDispatch();
	const handleSearch = (customQuery = ''): void => {
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
		setShowDropDown(false);
	};

	const urlQuery = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

	useEffect(() => {
		const urlQueryString = urlQuery.get('q');
		if (urlQueryString !== null) handleSearch(urlQueryString);
	}, []);

	return (
		<div ref={searchComponentRef} style={{ flex: 1 }}>
			<Search
				placeholder="Search Filter"
				onFocus={(): void => setShowDropDown(true)}
				value={queryString}
				onChange={(e): void => {
					updateQueryString(e.target.value);
				}}
				onSearch={handleSearch}
			/>
			<div style={{ position: 'relative' }}>
				{showDropDown && (
					<DropDownContainer>
						<Button
							type="text"
							onClick={(): void => setShowDropDown(false)}
							style={{
								position: 'absolute',
								top: 0,
								right: 0,
							}}
						>
							<CloseSquareOutlined />
						</Button>
						<SearchFields updateParsedQuery={updateParsedQuery as never} />
					</DropDownContainer>
				)}
			</div>
		</div>
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

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogs: bindActionCreators(getLogs, dispatch),
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(SearchFilter));
