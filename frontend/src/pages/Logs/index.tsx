import { Divider, Row } from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import LogsSearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import useUrlQuery from 'hooks/useUrlQuery';
import React, { memo, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import AppActions from 'types/actions';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';

import SpaceContainer from './styles';

function Logs({ getLogsFields }: LogsProps): JSX.Element {
	const urlQuery = useUrlQuery();

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch({
			type: SET_SEARCH_QUERY_STRING,
			payload: urlQuery.get('q'),
		});
	}, [dispatch, urlQuery]);

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
