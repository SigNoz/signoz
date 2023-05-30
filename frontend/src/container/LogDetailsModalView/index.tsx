import { Modal } from 'antd';
import GetLogs from 'api/logs/GetLogs';
import InputComponent from 'components/Input';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	SET_CURRENT_LOG,
	SET_NEXT_CURRENT_LOGS,
	SET_PREV_CURRENT_LOGS,
} from 'types/actions/logs';
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
	const [prevLoading, setPrevLoading] = useState<boolean>(true);
	const [nextLoading, setNextLoading] = useState<boolean>(true);
	const { currentLog, prevCurrentLogs, nextCurrentLogs } = useSelector<
		AppState,
		ILogsReducer
	>((state) => state.logs);

	useEffect(() => {
		if (currentLog) {
			GetLogs({
				q: "method in ('POST')",
				limit: 10,
				orderBy: 'id',
				idLt: currentLog.id,
				timestampStart: currentLog.timestamp,
				timestampEnd: currentLog.timestamp + 1e18,
				order: 'desc',
			}).then((res) => {
				setPrevLoading(false);
				dispatch({ type: SET_PREV_CURRENT_LOGS, payload: res.payload });
			});

			GetLogs({
				q: "method in ('POST')",
				limit: 10,
				orderBy: 'id',
				idLt: currentLog.id,
				timestampStart: currentLog.timestamp,
				timestampEnd: currentLog.timestamp + 1e18,
				order: 'asc',
			}).then((res) => {
				setNextLoading(false);
				dispatch({ type: SET_NEXT_CURRENT_LOGS, payload: res.payload });
			});
		}
	}, [currentLog, dispatch]);

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

	console.log('currentLog', currentLog);

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
				fetchLogs={(): void => {}}
				logs={prevCurrentLogs}
				isLoad={prevLoading}
			/>
			<CurrentLog log={text} />
			<HistoryLogs
				position={HistoryPosition.next}
				fetchLogs={(): void => {}}
				logs={nextCurrentLogs}
				isLoad={nextLoading}
			/>
		</Modal>
	);
}

export default LogDetailsModalView;
