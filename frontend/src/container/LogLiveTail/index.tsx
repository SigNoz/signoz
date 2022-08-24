/* eslint-disable react-hooks/exhaustive-deps */
import { green } from '@ant-design/colors';
import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Popover, Row, Select } from 'antd';
import { LiveTail } from 'api/logs/livetail';
import dayjs from 'dayjs';
import { throttle } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	FLUSH_LOGS,
	PUSH_LIVE_TAIL_EVENT,
	SET_LIVE_TAIL_START_TIME,
	TOGGLE_LIVE_TAIL,
} from 'types/actions/logs';
import { TLogsLiveTailState } from 'types/api/logs/liveTail';
import AppReducer from 'types/reducer/app';
import { ILogsReducer } from 'types/reducer/logs';

import OptionIcon from './OptionIcon';
import { TimePickerCard, TimePickerSelect } from './styles';

const { Option } = Select;

const TIME_PICKER_OPTIONS = [
	{
		value: 5,
		label: '5m',
	},
	{
		value: 15,
		label: '15m',
	},
	{
		value: 30,
		label: '30m',
	},
	{
		value: 60,
		label: '1hr',
	},
	{
		value: 360,
		label: '6hrs',
	},
	{
		value: 720,
		label: '12hrs',
	},
];

function LogLiveTail(): JSX.Element {
	const {
		liveTail,
		searchFilter: { queryString },
		liveTailStartRange,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const dispatch = useDispatch();
	const handleLiveTail = (toggleState: TLogsLiveTailState): void => {
		dispatch({
			type: TOGGLE_LIVE_TAIL,
			payload: toggleState,
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
			// console.log('DISPATCH', batchedEventsRef.current.length);
			batchedEventsRef.current = [];
		}, 1500),
		[],
	);

	const batchLiveLog = (e: { data: string }): void => {
		// console.log('EVENT BATCHED');
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
	return (
		<TimePickerCard>
			<Row
				style={{ gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}
			>
				<div>
					{liveTail === 'PLAYING' ? (
						<Button
							type="primary"
							onClick={(): void => handleLiveTail('PAUSED')}
							title="Pause live tail"
							style={{ background: green[6] }}
						>
							Pause <PauseOutlined />
						</Button>
					) : (
						<Button
							type="primary"
							onClick={handleLiveTailStart}
							title="Start live tail"
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
							<div
								style={{
									height: '0.8rem',
									width: '0.8rem',
									background: isDarkMode ? '#eee' : '#222',
									borderRadius: '0.1rem',
								}}
							/>
						</Button>
					)}
				</div>

				<Popover
					placement="bottomRight"
					title="Select Live Tail Timing"
					trigger="click"
					content={OptionsPopOverContent}
				>
					<span
						style={{
							padding: '0.3rem 0.4rem 0.3rem 0',
							display: 'flex',
							justifyContent: 'center',
							alignContent: 'center',
						}}
					>
						<OptionIcon isDarkMode={isDarkMode} />
					</span>
				</Popover>
			</Row>
		</TimePickerCard>
	);
}

export default LogLiveTail;
