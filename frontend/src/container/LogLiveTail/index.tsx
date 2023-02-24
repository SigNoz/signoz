import { green } from '@ant-design/colors';
import {
	MoreOutlined,
	PauseOutlined,
	PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Popover, Select, Space } from 'antd';
import { LiveTail } from 'api/logs/livetail';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import { throttle } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_AUTO_REFRESH_DISABLED } from 'types/actions/globalTime';
import {
	FLUSH_LOGS,
	PUSH_LIVE_TAIL_EVENT,
	SET_LIVE_TAIL_START_TIME,
	SET_LOADING,
	TOGGLE_LIVE_TAIL,
} from 'types/actions/logs';
import { TLogsLiveTailState } from 'types/api/logs/liveTail';
import { ILog } from 'types/api/logs/log';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import { TIME_PICKER_OPTIONS } from './config';
import { StopContainer, TimePickerCard, TimePickerSelect } from './styles';

function LogLiveTail(): JSX.Element {
	const {
		liveTail,
		searchFilter: { queryString },
		liveTailStartRange,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const isDarkMode = useIsDarkMode();

	const { selectedAutoRefreshInterval } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { notifications } = useNotifications();

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const handleLiveTail = (toggleState: TLogsLiveTailState): void => {
		dispatch({
			type: TOGGLE_LIVE_TAIL,
			payload: toggleState,
		});
		dispatch({
			type: UPDATE_AUTO_REFRESH_DISABLED,
			payload: toggleState === 'PLAYING',
		});
	};

	const batchedEventsRef = useRef<ILog[]>([]);

	console.log(batchedEventsRef.current);

	const pushLiveLog = useCallback(() => {
		dispatch({
			type: PUSH_LIVE_TAIL_EVENT,
			payload: batchedEventsRef.current.reverse(),
		});
		batchedEventsRef.current = [];
	}, [dispatch]);

	const pushLiveLogThrottled = useMemo(() => throttle(pushLiveLog, 1000), [
		pushLiveLog,
	]);

	const batchLiveLog = useCallback(
		(e: { data: string }): void => {
			batchedEventsRef.current.push(JSON.parse(e.data as string) as never);
			pushLiveLogThrottled();
		},
		[pushLiveLogThrottled],
	);

	const firstLogsId = useMemo(() => logs[0]?.id, [logs]);

	// This ref depicts thats whether the live tail is played from paused state or not.
	const liveTailSourceRef = useRef<EventSource>();

	useEffect(() => {
		if (liveTail === 'PLAYING') {
			const timeStamp = dayjs().subtract(liveTailStartRange, 'minute').valueOf();
			const queryParams = new URLSearchParams({
				...(queryString ? { q: queryString } : {}),
				timestampStart: (timeStamp * 1e6) as never,
				...(liveTailSourceRef.current && firstLogsId
					? {
							idGt: firstLogsId,
					  }
					: {}),
			});
			if (liveTailSourceRef.current) {
				liveTailSourceRef.current.close();
			}

			const source = LiveTail(queryParams.toString());
			liveTailSourceRef.current = source;
			source.onmessage = function connectionMessage(e): void {
				console.log({ e });
				batchLiveLog(e);
			};
			source.onerror = function connectionError(event: unknown): void {
				console.error(event);
				source.close();
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: 'STOPPED',
				});
				dispatch({
					type: SET_LOADING,
					payload: false,
				});
				if (event instanceof Error) {
					notifications.error({
						message: event.message || 'Live tail stopped due to some error.',
					});
				}
			};
		}

		if (liveTail === 'STOPPED') {
			liveTailSourceRef.current = undefined;
		}
	}, [liveTail, queryString, notifications, dispatch]);

	const handleLiveTailStart = (): void => {
		handleLiveTail('PLAYING');
		if (!liveTailSourceRef.current) {
			dispatch({
				type: FLUSH_LOGS,
			});
		}
	};

	useEffect(() => {
		if (liveTail === 'STOPPED') {
			liveTailSourceRef.current?.close();
		}
	}, [liveTail]);

	const OptionsPopOverContent = useMemo(
		() => (
			<TimePickerSelect
				disabled={liveTail === 'PLAYING'}
				value={liveTailStartRange}
				onChange={(value): void => {
					if (typeof value === 'number') {
						dispatch({
							type: SET_LIVE_TAIL_START_TIME,
							payload: value,
						});
					}
				}}
			>
				{TIME_PICKER_OPTIONS.map((optionData) => (
					<Select.Option key={optionData.label} value={optionData.value}>
						Last {optionData.label}
					</Select.Option>
				))}
			</TimePickerSelect>
		),
		[dispatch, liveTail, liveTailStartRange],
	);

	const isDisabled = useMemo(() => selectedAutoRefreshInterval?.length > 0, [
		selectedAutoRefreshInterval,
	]);

	return (
		<TimePickerCard>
			<Space size={0} align="center">
				{liveTail === 'PLAYING' ? (
					<Button
						type="primary"
						onClick={(): void => handleLiveTail('PAUSED')}
						title="Pause live tail"
						style={{ background: green[6] }}
					>
						<span>Pause</span>
						<PauseOutlined />
					</Button>
				) : (
					<Button
						type="primary"
						onClick={handleLiveTailStart}
						title="Start live tail"
						disabled={isDisabled}
					>
						Go Live <PlayCircleOutlined />
					</Button>
				)}

				{liveTail !== 'STOPPED' && (
					<Button
						type="dashed"
						onClick={(): void => handleLiveTail('STOPPED')}
						title="Exit live tail"
					>
						<StopContainer isDarkMode={isDarkMode} />
					</Button>
				)}

				<Popover
					placement="bottomRight"
					title="Select Live Tail Timing"
					trigger="click"
					content={OptionsPopOverContent}
				>
					<MoreOutlined style={{ fontSize: 24 }} />
				</Popover>
			</Space>
		</TimePickerCard>
	);
}

export default LogLiveTail;
