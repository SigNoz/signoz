import { Divider, Row } from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import useMountedState from 'hooks/useMountedState';
import useUrlQuery from 'hooks/useUrlQuery';
import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';

import SpaceContainer from './styles';

function Logs(): JSX.Element {
	const getMountedState = useMountedState();

	const urlQuery = useUrlQuery();
	const dispatch = useDispatch();

	useEffect(() => {
		const hasMounted = getMountedState();

		if (!hasMounted) {
			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: urlQuery.get('q'),
			});
		}
	}, [dispatch, getMountedState, urlQuery]);

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

export default memo(Logs);
