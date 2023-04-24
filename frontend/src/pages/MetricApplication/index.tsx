import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import MetricsApplicationContainer from 'container/MetricsApplication';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import React, { useEffect, useMemo } from 'react';
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
import { Tags } from 'types/reducer/trace';

function MetricsApplication({ getInitialData }: MetricsProps): JSX.Element {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { error, errorMessage, metricsApplicationLoading } = useSelector<
		AppState,
		MetricReducer
	>((state) => state.metrics);

	const { servicename } = useParams<ServiceProps>();
	const { queries } = useResourceAttribute();

	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	useEffect(() => {
		if (servicename !== undefined) {
			getInitialData({
				serviceName: servicename,
				maxTime,
				minTime,
				selectedTags,
			});
		}
	}, [servicename, getInitialData, maxTime, minTime, selectedTags]);

	if (metricsApplicationLoading) {
		return <Spinner tip="Loading..." />;
	}

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	return <MetricsApplicationContainer />;
}

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
