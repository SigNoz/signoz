import { Drawer, Tabs } from 'antd';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

import JSONView from './JsonView';
import TableView from './TableView';

const { TabPane } = Tabs;

function LogDetailedView(): JSX.Element {
	const { detailedLog } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);
	const dispatch = useDispatch();
	const onDrawerClose = (): void => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: null,
		});
	};

	return (
		<div style={{}}>
			<Drawer
				width="60%"
				title="Log Details"
				placement="right"
				closable
				mask={false}
				onClose={onDrawerClose}
				visible={detailedLog !== null}
				getContainer={false}
				style={{ overscrollBehavior: 'contain' }}
			>
				{detailedLog && (
					<Tabs defaultActiveKey="1">
						<TabPane tab="Table" key="1">
							<TableView logData={detailedLog} />
						</TabPane>
						<TabPane tab="JSON" key="2">
							<JSONView logData={detailedLog} />
						</TabPane>
					</Tabs>
				)}
			</Drawer>
		</div>
	);
}

export default LogDetailedView;
