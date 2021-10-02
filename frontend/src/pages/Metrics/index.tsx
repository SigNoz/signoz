import Spinner from 'components/Spinner';
import MetricTable from 'container/MetricsTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getServicesList } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalTime } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

const Metrics = ({ getServicesList }: MetricsProps): JSX.Element => {
	const { minTime, maxTime, loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		if (loading === false) {
			getServicesList({
				maxTime,
				minTime,
			});
		}
	}, [getServicesList, maxTime, minTime, loading]);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <MetricTable />;
};

interface DispatchProps {
	getServicesList: (globalTime: GlobalTime) => (dispatch: any) => Promise<void>;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getServicesList: bindActionCreators(getServicesList, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Metrics);
