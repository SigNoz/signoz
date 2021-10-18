import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import MetricsApplicationContainer from 'container/MetricsApplication';
import React, { useEffect, useRef } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators } from 'redux';
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
	const {
		loading: metricsLoading,
		topEndPoints,
		error,
		errorMessage,
	} = useSelector<AppState, MetricReducer>((state) => state.metrics);

	const { servicename } = useParams<ServiceProps>();
	const isMouted = useRef(true);

	useEffect(() => {
		if (servicename !== undefined && loading == false && isMouted.current) {
			getInitialData({
				end: maxTime,
				service: servicename,
				start: minTime,
				step: 60,
			});
		}

		return (): void => {
			isMouted.current = false;
		};
	}, [servicename, maxTime, minTime, getInitialData, loading]);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (
		metricsLoading ||
		topEndPoints.length === 0 ||
		loading ||
		servicename == undefined
	) {
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
