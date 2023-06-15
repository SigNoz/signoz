import { Modal } from 'antd';
import GetLogs from 'api/logs/GetLogs';
import dayjs from 'dayjs';
import { debounce } from 'lodash-es';
import { MouseEventHandler, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SET_CURRENT_LOG } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

// components
import CloseWrapperIcon from './components/CloseWrapperIcon';
import CurrentLog from './components/CurrentLog';
import HistoryLogs from './components/HistoryLogs';
import LogSearchFilter from './components/LogSearchFilter';
// types
import { HistoryPosition } from './interfaces/IHistoryLogs';

function LogDetailsModalView(): JSX.Element {
	const dispatch = useDispatch();
	const [filterInputVisible, setFilterInputVisible] = useState<boolean>(false);
	const [prevLogPage, setPrevLogPage] = useState<number>(1);
	const [nextLogPage, setNextLogPage] = useState<number>(1);
	const [query, setQuery] = useState<string>('');
	const { currentLog } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const debouncedSetQuery = useMemo(() => debounce(setQuery, 300), [setQuery]);

	const prevData = useQuery(['prevLogs', prevLogPage, currentLog, query], {
		queryFn: () =>
			GetLogs({
				q: query,
				limit: prevLogPage * 10,
				orderBy: 'id',
				idLt: currentLog?.id,
				timestampStart: minTime,
				timestampEnd: maxTime,
				order: 'desc',
			}),
		cacheTime: 0,
	});

	const nextData = useQuery(['nextLogs', nextLogPage, currentLog, query], {
		queryFn: () =>
			GetLogs({
				q: query,
				limit: prevLogPage * 10,
				orderBy: 'id',
				idGt: currentLog?.id,
				timestampStart: minTime,
				timestampEnd: maxTime,
				order: 'asc',
			}),
		cacheTime: 0,
	});

	const addMoreNextLogs = (): void => setNextLogPage(nextLogPage + 1);
	const addMorePrevLogs = (): void => setPrevLogPage(prevLogPage + 1);
	const toggleInputVisible: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		setFilterInputVisible(!filterInputVisible);
	};

	const handleCancel = (): void => {
		dispatch({
			type: SET_CURRENT_LOG,
			payload: null,
		});
	};

	const text = useMemo(
		() =>
			currentLog
				? `${dayjs(currentLog.timestamp / 1e6).format()} | ${currentLog.body}`
				: '',
		[currentLog],
	);

	return (
		<Modal
			title="Log Details"
			closable
			open={!!currentLog}
			footer={null}
			closeIcon={<CloseWrapperIcon toggleInput={toggleInputVisible} />}
			destroyOnClose
			onCancel={handleCancel}
		>
			{filterInputVisible && (
				<LogSearchFilter query={query} setQuery={debouncedSetQuery} />
			)}
			<HistoryLogs
				position={HistoryPosition.prev}
				addMoreLogs={addMorePrevLogs}
				logs={prevData.data?.payload as ILog[]}
				isLoad={prevData.isLoading}
				isError={prevData.isError}
			/>
			<CurrentLog log={text} />
			<HistoryLogs
				position={HistoryPosition.next}
				addMoreLogs={addMoreNextLogs}
				logs={nextData.data?.payload as ILog[]}
				isLoad={nextData.isLoading}
				isError={nextData.isError}
			/>
		</Modal>
	);
}

export default LogDetailsModalView;
