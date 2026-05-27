import { useCallback, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Button, Col, Popover, Row, Space } from 'antd';
import { SelectSimple, SelectSimpleItem } from '@signozhq/ui/select';
import { Divider } from '@signozhq/ui/divider';
import { QueryParams } from 'constants/query';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import history from 'lib/history';
// eslint-disable-next-line no-restricted-imports
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

import './logs.styles.scss';

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

	const isFormatButtonVisible = useMemo(
		() => logsOptions.includes(viewMode),
		[viewMode],
	);

	const selectedViewModeOption = useMemo(
		() => viewModeOption.value.toString(),
		[viewModeOption.value],
	);

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

	const viewModeItems = useMemo<SelectSimpleItem[]>(
		() =>
			viewModeOptionList.map((option) => ({
				value: option.value,
				label: option.label,
			})),
		[viewModeOptionList],
	);

	const orderSelectItems = useMemo<SelectSimpleItem[]>(
		() =>
			orderItems.map((item) => ({
				value: item.enum,
				label: item.name,
			})),
		[],
	);

	return (
		<div className="old-logs-explorer">
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
								<SelectSimple
									style={defaultSelectStyle}
									value={selectedViewModeOption}
									onChange={(value): void => onChangeVeiwMode(value as string)}
									items={viewModeItems}
								/>

								{isFormatButtonVisible && (
									<Popover
										getPopupContainer={popupContainer}
										placement="right"
										content={renderPopoverContent}
									>
										<Button>Format</Button>
									</Popover>
								)}

								<SelectSimple
									style={defaultSelectStyle}
									defaultValue={order}
									onChange={(value): void =>
										handleChangeOrder(value as OrderPreferenceItems)
									}
									items={orderSelectItems}
								/>
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
		</div>
	);
}

export default OldLogsExplorer;
