import { Divider, Row } from 'antd';
import LogControls from 'container/LogControls';
import LogDetailedView from 'container/LogDetailedView';
import LogLiveTail from 'container/LogLiveTail';
import LogsAggregate from 'container/LogsAggregate';
import LogsFilters from 'container/LogsFilters';
import SearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import React, { memo, useEffect, useMemo } from 'react';
import { connect, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import AppActions from 'types/actions';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';

interface LogsProps {
	getLogsFields: VoidFunction;
}
function Logs({ getLogsFields }: LogsProps): JSX.Element {
	const { search } = useLocation();

	const urlQuery = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

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
		<div style={{ position: 'relative' }}>
			<Row style={{ justifyContent: 'center', alignItems: 'center' }}>
				<SearchFilter />
				<Divider type="vertical" style={{ height: '2rem' }} />
				<LogLiveTail />
			</Row>
			<LogsAggregate />
			<LogControls />
			<Divider style={{ margin: 0 }} />
			<Row gutter={20} style={{ flexWrap: 'nowrap' }}>
				<LogsFilters />
				<Divider type="vertical" style={{ height: '100%', margin: 0 }} />
				<LogsTable />
			</Row>
			<LogDetailedView />
		</div>
	);
}

interface DispatchProps {
	getLogsFields: () => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsFields: bindActionCreators(GetLogsFields, dispatch),
});

export default connect(null, mapDispatchToProps)(memo(Logs));
