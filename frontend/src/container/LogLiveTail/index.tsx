import { green, red } from '@ant-design/colors';
import {
	ArrowRightOutlined,
	IeSquareFilled,
	PauseOutlined,
	PlayCircleOutlined,
	PlaySquareFilled,
	ReloadOutlined,
	StopFilled,
} from '@ant-design/icons';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Button, Card, Popover, Row, Select, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { LiveTail } from 'api/logs/livetail';
import { LOCALSTORAGE } from 'constants/localStorage';
import dayjs from 'dayjs';
import { debounce, throttle } from 'lodash-es';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
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
import ILogsReducer from 'types/reducer/logs';

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

function LogLiveTail() {
	const {
		liveTail,
		searchFilter: { queryString },
		liveTailStartRange,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const dispatch = useDispatch();
	const handleLiveTail = (toggleState: TLogsLiveTailState) => {
		dispatch({
			type: TOGGLE_LIVE_TAIL,
			payload: toggleState,
		});
	};

	const batchedEventsRef = useRef([]);

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

	const batchLiveLog = (e) => {
		// console.log('EVENT BATCHED');
		batchedEventsRef.current.push(JSON.parse(e.data));
		pushLiveLog();
	};

	// This ref depicts thats whether the live tail is played from paused state or not.
	const liveTailSourceRef = useRef(null);
	useEffect(() => {
		if (liveTail === 'PLAYING') {
			// console.log('Starting Live Tail', logs.length);
			const timeStamp = dayjs().subtract(liveTailStartRange, 'minute').valueOf();
			const queryParams = new URLSearchParams({
				...(queryString ? { q: queryString } : {}),
				timestampStart: timeStamp,
				...(liveTailSourceRef.current && logs.length > 0
					? {
						idGt: logs[0].id,
					}
					: {}),
			});
			const source = LiveTail(queryParams.toString());
			liveTailSourceRef.current = source;
			source.onmessage = function (e) {
				// pushLiveLog(e)
				batchLiveLog(e);
			};
			source.onopen = function (event) {
				// console.log('open event');
				// console.log(event);
			};
			source.onerror = function (event) {
				// console.log(event);
				source.close();
				dispatch({
					type: TOGGLE_LIVE_TAIL,
					payload: false,
				});
			};
		} else if (liveTailSourceRef.current) {
			liveTailSourceRef.current?.close();
		}

		if (liveTail === 'STOPPED') {
			liveTailSourceRef.current = null;
		}
	}, [liveTail]);

	const handleLiveTailStart = () => {
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
				onChange={(value) => {
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
							onClick={() => handleLiveTail('PAUSED')}
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
							onClick={() => handleLiveTail('STOPPED')}
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
