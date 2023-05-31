import {
	FastBackwardOutlined,
	LeftOutlined,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Divider, Select } from 'antd';
import { getGlobalTime } from 'container/LogsSearchFilter/utils';
import { getMinMax } from 'container/TopNav/AutoRefresh/config';
import { defaultSelectStyle } from 'pages/Logs/config';
import { memo, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	RESET_ID_START_AND_END,
	SET_LOG_LINES_PER_PAGE,
} from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import { ITEMS_PER_PAGE_OPTIONS } from './config';
import { Container } from './styles';

function LogControls(): JSX.Element | null {
	const {
		logLinesPerPage,
		liveTail,
		isLoading: isLogsLoading,
		isLoadingAggregate,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const handleLogLinesPerPageChange = (e: number): void => {
		dispatch({
			type: SET_LOG_LINES_PER_PAGE,
			payload: {
				logsLinesPerPage: e,
			},
		});
	};

	const handleGoToLatest = (): void => {
		const { maxTime, minTime } = getMinMax(
			globalTime.selectedTime,
			globalTime.minTime,
			globalTime.maxTime,
		);

		const updatedGlobalTime = getGlobalTime(globalTime.selectedTime, {
			maxTime,
			minTime,
		});

		if (updatedGlobalTime) {
			dispatch({
				type: RESET_ID_START_AND_END,
				payload: updatedGlobalTime,
			});
		}
	};

	const handleNavigatePrevious = (): void => {
		dispatch({
			type: GET_PREVIOUS_LOG_LINES,
		});
	};
	const handleNavigateNext = (): void => {
		dispatch({
			type: GET_NEXT_LOG_LINES,
		});
	};

	const isLoading = isLogsLoading || isLoadingAggregate;

	const isNextAndPreviousDisabled = useMemo(
		() =>
			isLoading ||
			logLinesPerPage === 0 ||
			logs.length === 0 ||
			logs.length < logLinesPerPage,
		[isLoading, logLinesPerPage, logs.length],
	);

	if (liveTail !== 'STOPPED') {
		return null;
	}

	return (
		<Container>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				onClick={handleGoToLatest}
			>
				<FastBackwardOutlined /> Go to latest
			</Button>
			<Divider type="vertical" />
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextAndPreviousDisabled}
				onClick={handleNavigatePrevious}
			>
				<LeftOutlined /> Previous
			</Button>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextAndPreviousDisabled}
				onClick={handleNavigateNext}
			>
				Next <RightOutlined />
			</Button>
			<Select
				style={defaultSelectStyle}
				loading={isLoading}
				value={logLinesPerPage}
				onChange={handleLogLinesPerPageChange}
			>
				{ITEMS_PER_PAGE_OPTIONS.map((count) => (
					<Select.Option
						key={count}
						value={count}
					>{`${count} / page`}</Select.Option>
				))}
			</Select>
		</Container>
	);
}

export default memo(LogControls);
