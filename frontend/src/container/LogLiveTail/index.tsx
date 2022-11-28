import { green } from '@ant-design/colors';
import {
	MoreOutlined,
	PauseOutlined,
	PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Popover, Select, Space } from 'antd';
import { LiveTail } from 'api/logs/livetail';
import dayjs from 'dayjs';
import { throttle } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { UPDATE_AUTO_REFRESH_DISABLED } from 'types/actions/globalTime';
import {
	FLUSH_LOGS,
	PUSH_LIVE_TAIL_EVENT,
	SET_LIVE_TAIL_START_TIME,
	TOGGLE_LIVE_TAIL,
} from 'types/actions/logs';
import { TLogsLiveTailState } from 'types/api/logs/liveTail';
import AppReducer from 'types/reducer/app';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import { TIME_PICKER_OPTIONS } from './config';
import { StopContainer, TimePickerCard, TimePickerSelect } from './styles';

const { Option } = Select;

function LogLiveTail(): JSX.Element {
	const {
		liveTail,
		searchFilter: { queryString },
		liveTailStartRange,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const { selectedAutoRefreshInterval } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch();
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

	const batchedEventsRef = useRef<Record<string, unknown>[]>([]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const pushLiveLog = useCallback(
		throttle(() => {
			dispatch({
				type: PUSH_LIVE_TAIL_EVENT,
				payload: batchedEventsRef.current.reverse(),
			});
			batchedEventsRef.current = [];
		}, 1500),
		[],
	);

	const batchLiveLog = (e: { data: string }): void => {
		batchedEventsRef.current.push(JSON.parse(e.data as string) as never);
		pushLiveLog();
	};

	// This ref depicts thats whether the live tail is played from paused state or not.
	const liveTailSourceRef = useRef<EventSource | null>(null);
	useEffect(() => {
		if (liveTail === 'PLAYING') {
			// console.log('Starting Live Tail', logs.length);
			const timeStamp = dayjs().subtract(liveTailStartRange, 'minute').valueOf();
			const queryParams = new URLSearchParams({
				...(queryString ? { q: queryString } : {}),
				timestampStart: (timeStamp * 1e6) as never,
				...(liveTailSourceRef.current && logs.length > 0
					? {
							idGt: logs[0].id,
					  }
					: {}),
			});
			const source = LiveTail(queryParams.toString());
			liveTailSourceRef.current = source;
			source.onmessage = function connectionMessage(e): void {
				batchLiveLog(e);
			};
			// source.onopen = function connectionOpen(): void { };
			source.onerror = function connectionError(event: unknown): void {
				console.error(event);
				source.close();
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: false,
				});
			};
		} else if (liveTailSourceRef.current && liveTailSourceRef.current.close) {
			liveTailSourceRef.current?.close();
		}

		if (liveTail === 'STOPPED') {
			liveTailSourceRef.current = null;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [liveTail]);

	const handleLiveTailStart = (): void => {
		handleLiveTail('PLAYING');
		if (!liveTailSourceRef.current) {
			dispatch({
				type: FLUSH_LOGS,
			});
		}
	};

	const OptionsPopOverContent = useMemo(
		() => (
			<TimePickerSelect
				disabled={liveTail === 'PLAYING'}
				value={liveTailStartRange}
				onChange={(value): void => {
					dispatch({
						type: SET_LIVE_TAIL_START_TIME,
						payload: value,
					});
				}}
			>
				{TIME_PICKER_OPTIONS.map((optionData) => (
					<Option key={optionData.label} value={optionData.value}>
						Last {optionData.label}
					</Option>
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
