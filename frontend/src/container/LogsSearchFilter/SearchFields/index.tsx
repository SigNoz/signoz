import React, { memo, useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetLogsFields } from 'store/actions/logs/getFields';
import AppActions from 'types/actions';

import QueryBuilder from './QueryBuilder';
import Suggestions from './Suggestions';

function SearchFields({ getLogsFields }): JSX.Element {
	useEffect(() => {
		getLogsFields();
	}, []);
	return (
		<>
			<QueryBuilder />
			<Suggestions />
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

export default connect(null, mapDispatchToProps)(memo(SearchFields));
