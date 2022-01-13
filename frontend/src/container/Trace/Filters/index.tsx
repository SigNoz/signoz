import React, { useEffect } from 'react';

import AppActions from 'types/actions';
import { ThunkDispatch } from 'redux-thunk';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { GetInitialFilter } from 'store/actions/trace/getInitialFilters';
import Panel from './Panel';

const Filters = ({ getInitialFilter }: Props): JSX.Element => {
	useEffect(() => {
		getInitialFilter();
	}, [getInitialFilter]);

	return (
		<>
			<Panel name="duration" />
			<Panel name="status" />
			<Panel name="serviceName" />
			<Panel name="component" />
			<Panel name="httpCode" />
			<Panel name="httpHost" />
			<Panel name="httpMethod" />
			<Panel name="httpRoute" />
			<Panel name="httpUrl" />
			<Panel name="operation" />
		</>
	);
};

interface DispatchProps {
	getInitialFilter: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
) => ({
	getInitialFilter: bindActionCreators(GetInitialFilter, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Filters);
