import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import MetricsApplicationContainer from 'container/MetricsApplication';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetApplicationData,
	GetInitialDataProps,
} from 'store/actions/metrics/getApplicationMetrics';
import { GetDatabaseMetrics } from 'store/actions/metrics/getDatabaseMetrics';
import { GetExternalCallMetrics } from 'store/actions/metrics/getExternalCallMetrics';
import { ResetInitialData } from 'store/actions/metrics/resetInitialData';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import MetricReducer from 'types/reducer/metrics';

const MetricsApplication = ({
	getInitialApplicationMetrics,
	getInitialDatabaseMetrics,
	getInitialExternalCallMetrics,
	resetInitialData,
}: MetricsProps): JSX.Element => {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { error, errorMessage, metricsApplicationLoading } = useSelector<
		AppState,
		MetricReducer
	>((state) => state.metrics);

	const { servicename } = useParams<ServiceProps>();

	useEffect(() => {
		if (servicename !== undefined) {
			const props = {
				serviceName: servicename,
				maxTime,
				minTime,
			};

			getInitialApplicationMetrics(props);
			getInitialDatabaseMetrics(props);
			getInitialExternalCallMetrics(props);
		}

		return (): void => {
			resetInitialData();
		};
	}, [
		servicename,
		getInitialApplicationMetrics,
		getInitialDatabaseMetrics,
		resetInitialData,
		getInitialExternalCallMetrics,
		maxTime,
		minTime,
	]);

	if (metricsApplicationLoading) {
		return <Spinner tip="Loading..." />;
	}

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	return <MetricsApplicationContainer />;
};

interface DispatchProps {
	getInitialApplicationMetrics: (props: GetInitialDataProps) => void;
	getInitialDatabaseMetrics: (props: GetInitialDataProps) => void;
	getInitialExternalCallMetrics: (props: GetInitialDataProps) => void;
	resetInitialData: () => void;
}

interface ServiceProps {
	servicename?: string;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialApplicationMetrics: bindActionCreators(GetApplicationData, dispatch),
	getInitialDatabaseMetrics: bindActionCreators(GetDatabaseMetrics, dispatch),
	getInitialExternalCallMetrics: bindActionCreators(
		GetExternalCallMetrics,
		dispatch,
	),
	resetInitialData: bindActionCreators(ResetInitialData, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(MetricsApplication);
