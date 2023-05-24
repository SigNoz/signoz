import { Button, Col, Divider, Popover, Row, Select, Space } from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';

import { defaultSelectStyle, logsOptions } from './config';
import { useSelectedLogView } from './hooks';
import PopoverContent from './PopoverContent';
import SpaceContainer from './styles';

function Logs(): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const showExpandedLog = useCallback(
		(logData: ILog) => {
			dispatch({
				type: SET_DETAILED_LOG_DATA,
				payload: logData,
			});
		},
		[dispatch],
	);

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
				<Col flex={1}>
					<Row>
						<Col flex={1}>
							<Space align="baseline" direction="horizontal">
								<Select
									style={defaultSelectStyle}
									value={selectedViewModeOption}
									onChange={onChangeVeiwMode}
								>
									{viewModeOptionList.map((option) => (
										<Select.Option key={option.value}>{option.label}</Select.Option>
									))}
								</Select>

								{isFormatButtonVisible && (
									<Popover placement="right" content={renderPopoverContent}>
										<Button>Format</Button>
									</Popover>
								)}
							</Space>
						</Col>

						<Col>
							<LogControls />
						</Col>
					</Row>

					<LogsTable
						viewMode={viewMode}
						linesPerRow={linesPerRow}
						onClickExpand={showExpandedLog}
					/>
				</Col>
			</Row>

			<LogDetailedView />
		</>
	);
}

export default Logs;
