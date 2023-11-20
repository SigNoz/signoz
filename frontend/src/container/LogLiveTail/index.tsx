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
import getStep from 'lib/getStep';
import { throttle } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
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
import { popupContainer } from 'utils/selectPopupContainer';

import { TIME_PICKER_OPTIONS } from './config';
import { StopContainer, TimePickerCard, TimePickerSelect } from './styles';

function LogLiveTail({ getLogsAggregate }: Props): JSX.Element {
	const {
		liveTail,
		searchFilter: { queryString },
		liveTailStartRange,
		logs,
		idEnd,
		idStart,
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
				notifications.error({
					message: 'Live tail stopped due to some error.',
				});
			};
		}

		if (liveTail === 'STOPPED') {
			liveTailSourceRef.current = undefined;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [liveTail, queryString, notifications, dispatch]);

	const handleLiveTailStart = (): void => {
		handleLiveTail('PLAYING');
		const startTime =
			dayjs().subtract(liveTailStartRange, 'minute').valueOf() * 1e6;

		const endTime = dayjs().valueOf() * 1e6;

		getLogsAggregate({
			timestampStart: startTime,
			timestampEnd: endTime,
			step: getStep({
				start: startTime,
				end: endTime,
				inputFormat: 'ns',
			}),
			q: queryString,
			...(idStart ? { idGt: idStart } : {}),
			...(idEnd ? { idLt: idEnd } : {}),
		});

		if (!liveTailSourceRef.current) {
			dispatch({
				type: FLUSH_LOGS,
			});
		}
	};

	const OptionsPopOverContent = useMemo(
		() => (
			<TimePickerSelect
				getPopupContainer={popupContainer}
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

	const onLiveTailStop = (): void => {
		handleLiveTail('STOPPED');
		dispatch({
			type: UPDATE_AUTO_REFRESH_DISABLED,
			payload: false,
		});
		dispatch({
			type: SET_LOADING,
			payload: false,
		});
		if (liveTailSourceRef.current) {
			liveTailSourceRef.current.close();
		}
	};

	return (
		<TimePickerCard>
			<Space size={0} align="center">
				{liveTail === 'PLAYING' ? (
					<Button
						type="primary"
						onClick={onLiveTailStop}
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
					<Button type="dashed" onClick={onLiveTailStop} title="Exit live tail">
						<StopContainer isDarkMode={isDarkMode} />
					</Button>
				)}

				<Popover
					getPopupContainer={popupContainer}
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

interface DispatchProps {
	getLogsAggregate: typeof getLogsAggregate;
}

type Props = DispatchProps;

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(LogLiveTail);
