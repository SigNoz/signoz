import { Divider, Row } from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import React from 'react';

import SpaceContainer from './styles';

function Logs(): JSX.Element {
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
			<Divider plain orientationMargin={1} />
			<Row gutter={20} wrap={false}>
				<LogsFilters />
				<Divider type="vertical" />
				<LogsTable />
			</Row>
			<LogDetailedView />
		</>
	);
}

export default Logs;
