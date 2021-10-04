import Spinner from 'components/Spinner';
import MetricTable from 'container/MetricsTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetService, GetServiceProps } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

const Metrics = ({ getService }: MetricsProps): JSX.Element => {
	const { minTime, maxTime, loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		if (loading === false) {
			getService({
				start: minTime,
				end: maxTime,
			});
		}
	}, [getService, maxTime, minTime, loading]);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <MetricTable />;
};

interface DispatchProps {
	getService: ({
		end,
		start,
	}: GetServiceProps) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getService: bindActionCreators(GetService, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Metrics);
