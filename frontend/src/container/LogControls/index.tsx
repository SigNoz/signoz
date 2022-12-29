import {
	FastBackwardOutlined,
	LeftOutlined,
	RightOutlined,
} from '@ant-design/icons';
import { Button, Divider, Select } from 'antd';
import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	RESET_ID_START_AND_END,
	SET_LOG_LINES_PER_PAGE,
} from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

import { Container } from './styles';

const { Option } = Select;

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100, 200];

function LogControls(): JSX.Element | null {
	const { logLinesPerPage, liveTail } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);
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

	if (liveTail !== 'STOPPED') {
		return null;
	}
	return (
		<Container>
			<Button size="small" type="link" onClick={handleGoToLatest}>
				<FastBackwardOutlined /> Go to latest
			</Button>
			<Divider type="vertical" />
			<Button size="small" type="link" onClick={handleNavigatePrevious}>
				<LeftOutlined /> Previous
			</Button>
			<Button size="small" type="link" onClick={handleNavigateNext}>
				Next <RightOutlined />
			</Button>
			<Select
				style={{ width: 120 }}
				value={logLinesPerPage}
				onChange={handleLogLinesPerPageChange}
			>
				{ITEMS_PER_PAGE_OPTIONS.map((count) => {
					return <Option key={count} value={count}>{`${count} / page`}</Option>;
				})}
			</Select>
		</Container>
	);
}

export default memo(LogControls);
