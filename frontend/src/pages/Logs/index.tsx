import './logs.styles.scss';

import { Button, Col, Divider, Popover, Row, Select, Space } from 'antd';
import { QueryParams } from 'constants/query';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import history from 'lib/history';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { SET_LOGS_ORDER } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';
import { popupContainer } from 'utils/selectPopupContainer';

import {
	defaultSelectStyle,
	logsOptions,
	orderItems,
	OrderPreferenceItems,
} from './config';
import { useSelectedLogView } from './hooks';
import PopoverContent from './PopoverContent';
import SpaceContainer from './styles';

function OldLogsExplorer(): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const { order } = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const location = useLocation();

	const {
		viewModeOptionList,
		viewModeOption,
		viewMode,
		handleViewModeOptionChange,
		linesPerRow,
		handleLinesPerRowChange,
	} = useSelectedLogView();

	const renderPopoverContent = useCallback(
		() => (
			<PopoverContent
				linesPerRow={linesPerRow}
				handleLinesPerRowChange={handleLinesPerRowChange}
			/>
		),
		[linesPerRow, handleLinesPerRowChange],
	);

	const isFormatButtonVisible = useMemo(() => logsOptions.includes(viewMode), [
		viewMode,
	]);

	const selectedViewModeOption = useMemo(() => viewModeOption.value.toString(), [
		viewModeOption.value,
	]);

	const onChangeVeiwMode = useCallback(
		(key: string) => {
			handleViewModeOptionChange({
				key,
			});
		},
		[handleViewModeOptionChange],
	);

	const handleChangeOrder = (value: OrderPreferenceItems): void => {
		dispatch({
			type: SET_LOGS_ORDER,
			payload: value,
		});
		const params = new URLSearchParams(location.search);
		params.set(QueryParams.order, value);
		history.push({ search: params.toString() });
	};

	return (
		<>
			<SpaceContainer
				split={<Divider type="vertical" />}
				align="center"
				direction="horizontal"
			>
				<LogsSearchFilter />
				<LogLiveTail />
			</SpaceContainer>

			<LogsAggregate />

			<Row gutter={20} wrap={false}>
				<LogsFilters />
				<Col flex={1} className="logs-col-container">
					<Row>
						<Col flex={1}>
							<Space align="baseline" direction="horizontal">
								<Select
									getPopupContainer={popupContainer}
									style={defaultSelectStyle}
									value={selectedViewModeOption}
									onChange={onChangeVeiwMode}
								>
									{viewModeOptionList.map((option) => (
										<Select.Option key={option.value}>{option.label}</Select.Option>
									))}
								</Select>

								{isFormatButtonVisible && (
									<Popover
										getPopupContainer={popupContainer}
										placement="right"
										content={renderPopoverContent}
									>
										<Button>Format</Button>
									</Popover>
								)}

								<Select
									getPopupContainer={popupContainer}
									style={defaultSelectStyle}
									defaultValue={order}
									onChange={handleChangeOrder}
								>
									{orderItems.map((item) => (
										<Select.Option key={item.enum}>{item.name}</Select.Option>
									))}
								</Select>
							</Space>
						</Col>

						<Col>
							<LogControls />
						</Col>
					</Row>

					<LogsTable viewMode={viewMode} linesPerRow={linesPerRow} />
				</Col>
			</Row>

			<LogDetailedView />
		</>
	);
}

export default OldLogsExplorer;
