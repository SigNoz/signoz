import { Modal } from 'antd';
import GetLogs from 'api/logs/GetLogs';
import InputComponent from 'components/Input';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
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
// types
import { HistoryPosition } from './interfaces/IHistoryLogs';

function LogDetailsModalView(): JSX.Element {
	const dispatch = useDispatch();
	const [filterInputVisible, setFilterInputVisible] = useState<boolean>(false);
	const [prevLogPage, setPrevLogPage] = useState<number>(1);
	const [nextLogPage, setNextLogPage] = useState<number>(1);
	const { currentLog } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const prevData = useQuery(['allAlerts', prevLogPage], {
		queryFn: () =>
			GetLogs({
				q: "method in ('POST')",
				limit: prevLogPage * 10,
				orderBy: 'id',
				idLt: currentLog?.id,
				timestampStart: minTime,
				timestampEnd: maxTime,
				order: 'desc',
			}),
		cacheTime: 0,
	});

	const nextData = useQuery(['allAlerts', nextLogPage], {
		queryFn: () =>
			GetLogs({
				q: "method in ('POST')",
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
	const addMorePrevLogs = (): void => setPrevLogPage(nextLogPage + 1);

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
			closeIcon={
				<CloseWrapperIcon
					toggleInput={(): void => setFilterInputVisible(!filterInputVisible)}
				/>
			}
			destroyOnClose
			onCancel={handleCancel}
		>
			{filterInputVisible && <InputComponent value="" />}
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
