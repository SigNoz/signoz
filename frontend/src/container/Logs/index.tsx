import { Divider, Row } from 'antd';
import LogControls from 'container/LogControls';
import LogsFilters from 'container/LogsFilters';
import SearchFilter from 'container/LogsSearchFilter';
import LogsTable from 'container/LogsTable';
import React, { memo, useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import AppActions from 'types/actions';

function Logs({ getLogsFields }) {
	useEffect(() => {
		getLogsFields();
	}, [getLogsFields]);

	return (
		<>
			<div>
				<SearchFilter />
			</div>
			<div
				style={{
					width: '100%',
					height: '200px',
					background: '#ccc2',
					margin: '1rem 0',
				}}
			>
				Graph PlaceHolder
			</div>
			<LogControls />
			<Divider style={{ margin: 0 }} />
			<Row gutter={20} style={{ flexWrap: 'nowrap' }}>
				<LogsFilters flex="450px" />
				<Divider type="vertical" style={{ height: '100%', margin: 0 }} />
				<LogsTable flex="auto" />
			</Row>
		</>
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
