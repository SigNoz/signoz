import {
	FastBackwardOutlined,
	LeftOutlined,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Divider, Select } from 'antd';
import React, { memo, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	RESET_ID_START_AND_END,
	SET_LOG_LINES_PER_PAGE,
} from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

import { ITEMS_PER_PAGE_OPTIONS } from './config';
import { Container } from './styles';

const { Option } = Select;

function LogControls(): JSX.Element | null {
	const {
		logLinesPerPage,
		liveTail,
		isLoading: isLogsLoading,
		isLoadingAggregate,
		logs,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const dispatch = useDispatch();

	const handleLogLinesPerPageChange = (e: number): void => {
		dispatch({
			type: SET_LOG_LINES_PER_PAGE,
			payload: e,
		});
	};

	const handleGoToLatest = (): void => {
		dispatch({
			type: RESET_ID_START_AND_END,
		});
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
				loading={isLoading}
				value={logLinesPerPage}
				onChange={handleLogLinesPerPageChange}
			>
				{ITEMS_PER_PAGE_OPTIONS.map((count) => (
					<Option key={count} value={count}>{`${count} / page`}</Option>
				))}
			</Select>
		</Container>
	);
}

export default memo(LogControls);
