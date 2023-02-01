import {
	Button,
	Col,
	Divider,
	Dropdown,
	InputNumber,
	Popover,
	Row,
} from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import useMountedState from 'hooks/useMountedState';
import useUrlQuery from 'hooks/useUrlQuery';
import React, { memo, useCallback, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import AppActions from 'types/actions';
import {
	SET_DETAILED_LOG_DATA,
	SET_SEARCH_QUERY_STRING,
} from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';

import { useSelectedLogView } from './hooks';
import SpaceContainer from './styles';

type PopoverContentProps = {
	linesPerRow: number;
	handleLinesPerRowChange: (l: unknown) => void;
};

function PopoverContent(props: PopoverContentProps): JSX.Element {
	const { linesPerRow, handleLinesPerRowChange } = props;

	return (
		<Row align="middle">
			<span style={{ marginRight: 10 }}>Max lines per Row </span>
			<InputNumber
				min={1}
				max={10}
				value={linesPerRow}
				onChange={handleLinesPerRowChange}
				style={{ width: '60px' }}
			/>
		</Row>
	);
}

function Logs({ getLogsFields }: LogsProps): JSX.Element {
	const getMountedState = useMountedState();

	const urlQuery = useUrlQuery();
	const dispatch = useDispatch();

	const {
		viewModeOptionList,
		viewModeOption,
		viewMode,
		handleViewModeOptionChange,
		linesPerRow,
		handleLinesPerRowChange,
	} = useSelectedLogView();

	const showExpandedLog = useCallback(
		(logData: ILog) => {
			dispatch({
				type: SET_DETAILED_LOG_DATA,
				payload: logData,
			});
		},
		[dispatch],
	);

	const renderPopoverContent = useCallback(() => {
		return (
			<PopoverContent
				linesPerRow={linesPerRow}
				handleLinesPerRowChange={handleLinesPerRowChange}
			/>
		);
	}, [linesPerRow, handleLinesPerRowChange]);

	useEffect(() => {
		const hasMounted = getMountedState();

		if (!hasMounted) {
			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: urlQuery.get('q'),
			});
		}
	}, [dispatch, getMountedState, urlQuery]);

	useEffect(() => {
		getLogsFields();
	}, [getLogsFields]);

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
			<LogControls />

			<Row gutter={20} wrap={false}>
				<Col style={{ minWidth: 180 }}>
					<div style={{ height: 58 }} />
					<LogsFilters />
				</Col>
				<Col style={{ width: '100%' }}>
					<Row style={{ paddingTop: 13, paddingBottom: 13 }}>
						<Dropdown
							menu={{
								items: viewModeOptionList,
								onClick: handleViewModeOptionChange,
							}}
						>
							<Button
								style={{
									marginRight: 16,
								}}
							>
								{viewModeOption.label}
							</Button>
						</Dropdown>

						{['raw', 'table'].includes(viewMode) && (
							<Popover placement="right" content={renderPopoverContent}>
								<Button>Format</Button>
							</Popover>
						)}
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

type LogsProps = DispatchProps;

interface DispatchProps {
	getLogsFields: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsFields: bindActionCreators(GetLogsFields, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(Logs));
