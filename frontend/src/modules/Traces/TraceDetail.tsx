import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading } from 'store/actions';
import AppActions from 'types/actions';

import { TraceCustomVisualizations } from './TraceCustomVisualizations';
import { TraceFilter } from './TraceFilter';
import { TraceList } from './TraceList';

const TraceDetail = ({ globalTimeLoading }: Props): JSX.Element => {
	useEffect(() => {
		return (): void => {
			globalTimeLoading();
		};
	}, [globalTimeLoading]);

	return (
		<>
			<TraceFilter />
			<TraceCustomVisualizations />
			<TraceList />
		</>
	);
};

interface DispatchProps {
	globalTimeLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	globalTimeLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceDetail);
