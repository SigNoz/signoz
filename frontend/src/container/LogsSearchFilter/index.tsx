import { CloseCircleFilled } from '@ant-design/icons';
import { Button, Input } from 'antd';
import useClickOutside from 'hooks/useClickOutside';
import React, { memo, useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useClickAway } from 'react-use';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogs } from 'store/actions/logs/getLogs';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

import SearchFields from './SearchFields';
import { DropDownContainer } from './styles';
import { useSearchParser } from './useSearchParser';

const { Search } = Input;

function SearchFilter({ getLogs }) {
	const {
		queryString,
		updateParsedQuery,
		updateQueryString,
	} = useSearchParser();
	const [showDropDown, setShowDropDown] = useState(false);

	const { logLinesPerPage, idEnd, idStart } = useSelector<
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
				// 'ant-empty-image',
				// 'ant-select-item',
				// 'ant-col',
				'ant-select-item-option-content',
				'ant-select-item-option-active',
			].find((p) => p.indexOf(e.className) !== -1) &&
			!(e.ariaSelected === 'true') &&
			showDropDown
		) {
			setShowDropDown(false);
		}
	});

	const handleSearch = (): void => {
		getLogs({
			q: queryString,
			limit: logLinesPerPage,
			orderBy: 'timestamp',
			order: 'desc',
			timestampStart: minTime,
			timestampEnd: maxTime,
			...(idStart ? { idStart } : {}),
			...(idEnd ? { idEnd } : {}),
		});
		setShowDropDown(false)
	};
	return (
		<div ref={searchComponentRef}>
			<Search
				placeholder="Search Filter"
				onFocus={(): void => setShowDropDown(true)}
				value={queryString}
				onChange={(e): void => updateQueryString(e.target.value)}
				onSearch={handleSearch}
			/>
			<div style={{ position: 'relative' }}>
				{showDropDown && (
					<DropDownContainer>
						<Button
							type="text"
							onClick={() => setShowDropDown(false)}
							style={{
								position: 'absolute',
								top: 0,
								right: 0,
							}}
						>
							<CloseCircleFilled />
						</Button>
						<SearchFields updateParsedQuery={updateParsedQuery} />
					</DropDownContainer>
				)}
			</div>
		</div>
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

export default connect(null, mapDispatchToProps)(memo(SearchFilter));
