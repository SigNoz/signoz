import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import MetricsApplicationContainer from 'container/MetricsApplication';
import React, { useEffect } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetInitialData,
	GetInitialDataProps,
} from 'store/actions/metrics/getInitialData';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import MetricReducer from 'types/reducer/metrics';

const MetricsApplication = ({ getInitialData }: MetricsProps): JSX.Element => {
	const { loading, maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { error, errorMessage } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const { servicename } = useParams<ServiceProps>();

	const dispatch = useDispatch<Dispatch<AppActions>>();

	useEffect(() => {
		if (servicename !== undefined && loading == false) {
			getInitialData({
				end: maxTime,
				service: servicename,
				start: minTime,
				step: 60,
			});
		}

		return (): void => {
			// setting the data to it's initial this will avoid the re-rendering the graph
			dispatch({
				type: 'GET_INTIAL_APPLICATION_DATA',
				payload: {
					serviceOverview: [],
					topEndPoints: [],
				},
			});
		};
	}, [servicename, maxTime, minTime, getInitialData, loading, dispatch]);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <MetricsApplicationContainer />;
};

interface DispatchProps {
	getInitialData: (props: GetInitialDataProps) => void;
}

interface ServiceProps {
	servicename?: string;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialData: bindActionCreators(GetInitialData, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(MetricsApplication);
